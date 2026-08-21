import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { URL } from 'url';

type HttpMethod = 'GET' | 'POST';

interface RawResponse {
    status: number;
    headers: http.IncomingHttpHeaders;
    body: string;
}

const md5 = (value: string): string =>
    crypto.createHash('md5').update(value).digest('hex');

const parseDigestChallenge = (header: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const regex = /(\w+)=(?:"([^"]*)"|([^\s,]+))/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(header)) !== null) {
        params[match[1]] = match[2] ?? match[3];
    }
    return params;
};

const headerValue = (value: string | string[] | undefined): string => {
    if (!value) return '';
    return Array.isArray(value) ? value.join(', ') : value;
};

export class HikvisionDigestClient {
    private nc = 0;
    private challenge: Record<string, string> | null = null;
    private readonly httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    private readonly httpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 1,
        rejectUnauthorized: false
    });

    constructor(
        private readonly username: string,
        private readonly password: string,
        private readonly timeoutMs = 20000
    ) {}

    async get<T = unknown>(url: string): Promise<T> {
        return this.request<T>(url, 'GET');
    }

    async post<T = unknown>(url: string, body: unknown): Promise<T> {
        return this.request<T>(url, 'POST', body);
    }

    private async request<T>(url: string, method: HttpMethod, body?: unknown): Promise<T> {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        let res = await this.rawRequest(url, method, payload, this.challenge);

        if (res.status === 401) {
            this.assertNotLocked(res.body);
            const www = headerValue(res.headers['www-authenticate']);
            if (!/digest/i.test(www)) {
                throw new Error(
                    `El reloj rechazó la autenticación (HTTP 401). ${res.body.slice(0, 300)}`
                );
            }
            this.challenge = parseDigestChallenge(www);
            res = await this.rawRequest(url, method, payload, this.challenge);
        }

        if (res.status === 401) {
            this.assertNotLocked(res.body);
            throw new Error('Usuario o contraseña del reloj inválidos (Digest Auth).');
        }

        if (res.status < 200 || res.status >= 300) {
            throw new Error(
                `El reloj respondió HTTP ${res.status}: ${res.body.slice(0, 500)}`
            );
        }

        if (!res.body) return {} as T;

        try {
            return JSON.parse(res.body) as T;
        } catch {
            throw new Error(
                `El reloj no devolvió JSON. Inicio de respuesta: ${res.body.slice(0, 200)}`
            );
        }
    }

    private assertNotLocked(body: string): void {
        if (/lockStatus/i.test(body)) {
            throw new Error(
                'El reloj bloqueó la cuenta por intentos fallidos. Esperar el tiempo de desbloqueo e intentar de nuevo.'
            );
        }
    }

    private buildDigest(
        method: HttpMethod,
        uri: string,
        challenge: Record<string, string>,
        nc: number
    ): string {
        const realm = challenge.realm || '';
        const nonce = challenge.nonce || '';
        const qop = (challenge.qop || '').split(',')[0].trim();
        const opaque = challenge.opaque;
        const algorithm = challenge.algorithm || 'MD5';
        const ncStr = nc.toString(16).padStart(8, '0');
        const cnonce = crypto.randomBytes(8).toString('hex');
        const ha1 = md5(`${this.username}:${realm}:${this.password}`);
        const ha2 = md5(`${method}:${uri}`);
        const response = qop
            ? md5(`${ha1}:${nonce}:${ncStr}:${cnonce}:${qop}:${ha2}`)
            : md5(`${ha1}:${nonce}:${ha2}`);

        const parts = [
            `username="${this.username}"`,
            `realm="${realm}"`,
            `nonce="${nonce}"`,
            `uri="${uri}"`,
            `algorithm=${algorithm}`,
            `response="${response}"`
        ];

        if (qop) {
            parts.push(`qop=${qop}`, `nc=${ncStr}`, `cnonce="${cnonce}"`);
        }
        if (opaque) {
            parts.push(`opaque="${opaque}"`);
        }

        return `Digest ${parts.join(', ')}`;
    }

    private rawRequest(
        urlStr: string,
        method: HttpMethod,
        body: string | undefined,
        challenge: Record<string, string> | null
    ): Promise<RawResponse> {
        return new Promise((resolve, reject) => {
            const url = new URL(urlStr);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;
            const uri = `${url.pathname}${url.search}`;
            const headers: http.OutgoingHttpHeaders = {
                Accept: 'application/json',
                Connection: 'keep-alive'
            };

            if (body !== undefined) {
                headers['Content-Type'] = 'application/json; charset=UTF-8';
                headers['Content-Length'] = Buffer.byteLength(body);
            }

            if (challenge) {
                this.nc += 1;
                headers.Authorization = this.buildDigest(method, uri, challenge, this.nc);
            }

            const req = lib.request(
                {
                    protocol: url.protocol,
                    hostname: url.hostname,
                    port: url.port || (isHttps ? 443 : 80),
                    path: uri,
                    method,
                    headers,
                    agent: isHttps ? this.httpsAgent : this.httpAgent,
                    timeout: this.timeoutMs
                },
                (res) => {
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk) => chunks.push(chunk as Buffer));
                    res.on('end', () => {
                        resolve({
                            status: res.statusCode || 0,
                            headers: res.headers,
                            body: Buffer.concat(chunks).toString('utf8')
                        });
                    });
                }
            );

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Timeout al consultar el reloj (${this.timeoutMs}ms)`));
            });

            if (body !== undefined) {
                req.write(body);
            }
            req.end();
        });
    }
}
