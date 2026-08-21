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

const findDigestHeader = (headers: http.IncomingHttpHeaders): string => {
    const raw = headers['www-authenticate'];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.find((item) => /digest/i.test(item)) || '';
};

export class HikvisionDigestClient {
    private nc = 0;
    private challenge: Record<string, string> | null = null;
    private queue: Promise<unknown> = Promise.resolve();
    private readonly httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    private readonly httpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 1,
        rejectUnauthorized: false
    });

    constructor(
        private readonly baseUrl: string,
        private readonly username: string,
        private readonly password: string,
        private readonly timeoutMs = 10000
    ) {}

    async get<T = unknown>(url: string): Promise<T> {
        return this.enqueue(() => this.request<T>(url, 'GET'));
    }

    async post<T = unknown>(url: string, body: unknown): Promise<T> {
        return this.enqueue(() => this.request<T>(url, 'POST', body));
    }

    private enqueue<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.queue.then(fn, fn);
        this.queue = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    private async request<T>(url: string, method: HttpMethod, body?: unknown): Promise<T> {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        await this.ensureChallenge();

        let res = await this.rawRequest(url, method, payload, this.challenge);
        res = await this.authenticateIfNeeded(url, method, payload, res);

        if (res.status === 401) {
            this.assertNotLocked(res.body);
            this.challenge = null;
            this.nc = 0;
            await this.ensureChallenge(true);
            res = await this.rawRequest(url, method, payload, this.challenge);
            res = await this.authenticateIfNeeded(url, method, payload, res);
        }

        if (res.status === 401) {
            this.assertNotLocked(res.body);
            throw new Error(
                'Usuario o contraseña del reloj inválidos (Digest Auth). Revisa HIKVISION_PASSWORD.'
            );
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

    private async authenticateIfNeeded(
        url: string,
        method: HttpMethod,
        payload: string | undefined,
        res: RawResponse
    ): Promise<RawResponse> {
        if (res.status !== 401) return res;
        this.assertNotLocked(res.body);

        const www = findDigestHeader(res.headers);
        if (!/digest/i.test(www)) return res;

        this.challenge = parseDigestChallenge(www);
        return this.rawRequest(url, method, payload, this.challenge);
    }

    private async ensureChallenge(force = false): Promise<void> {
        if (this.challenge && !force) return;

        const infoUrl = `${this.baseUrl.replace(/\/$/, '')}/ISAPI/System/deviceInfo`;
        const res = await this.rawRequest(infoUrl, 'GET', undefined, null);
        const www = findDigestHeader(res.headers);
        if (/digest/i.test(www)) {
            this.challenge = parseDigestChallenge(www);
            return;
        }

        if (res.status === 200) return;
        this.assertNotLocked(res.body);
    }

    private assertNotLocked(body: string): void {
        if (!/lockStatus/i.test(body)) return;
        const until = body.match(/<unlockTime>(.*?)<\/unlockTime>/i)?.[1];
        const extra = until ? ` Quedan ${until}s.` : ' Suele durar 30 minutos.';
        throw new Error(
            `El reloj bloqueó la cuenta por intentos fallidos.${extra} No reintentes hasta que se desbloquee.`
        );
    }

    private buildDigest(
        method: HttpMethod,
        uri: string,
        challenge: Record<string, string>,
        nc: number
    ): string {
        const realm = challenge.realm || '';
        const nonce = challenge.nonce || '';
        const qop = (challenge.qop || 'auth').split(',')[0].trim() || 'auth';
        const opaque = challenge.opaque;
        const algorithm = challenge.algorithm || 'MD5';
        const ncStr = nc.toString(16).padStart(8, '0');
        const cnonce = crypto.randomBytes(8).toString('hex');

        let ha1 = md5(`${this.username}:${realm}:${this.password}`);
        if (/md5-sess/i.test(algorithm)) {
            ha1 = md5(`${ha1}:${nonce}:${cnonce}`);
        }
        const ha2 = md5(`${method}:${uri}`);
        const response = md5(`${ha1}:${nonce}:${ncStr}:${cnonce}:${qop}:${ha2}`);

        const parts = [
            `username="${this.username}"`,
            `realm="${realm}"`,
            `nonce="${nonce}"`,
            `uri="${uri}"`,
            `algorithm=${algorithm}`,
            `response="${response}"`,
            `qop="${qop}"`,
            `nc=${ncStr}`,
            `cnonce="${cnonce}"`
        ];
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
                Accept: 'application/json, application/xml, */*',
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
