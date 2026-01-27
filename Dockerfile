# Usamos una imagen base de Node sobre Debian (Buster/Bullseye)
# FORZAMOS linux/amd64 para asegurar compatibilidad total con el Instant Client de Oracle
FROM --platform=linux/amd64 node:18-bullseye

# 1. Instalar libaio1 (Requisito OBLIGATORIO para Oracle Instant Client)
RUN apt-get update && apt-get install -y \
    libaio1 \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar estructura de directorios
WORKDIR /app

# 3. Descargar e instalar Oracle Instant Client 19c (Compatible con Oracle 11g)
WORKDIR /opt/oracle
# Descargamos la versión Basic Lite para Linux x64
RUN wget https://download.oracle.com/otn_software/linux/instantclient/1919000/instantclient-basiclite-linux.x64-19.19.0.0.0dbru.zip \
    && unzip instantclient-basiclite-linux.x64-19.19.0.0.0dbru.zip \
    && rm instantclient-basiclite-linux.x64-19.19.0.0.0dbru.zip

# 4. Establecer variables de entorno para que Node encuentre las librerías
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_19_19
ENV ORACLE_LIB_DIR=/opt/oracle/instantclient_19_19

# Volvemos al directorio de la app
WORKDIR /app

# 5. Copiar dependencias e instalarlas
COPY package*.json ./
RUN npm install

# Instalar ts-node-dev globalmente por si acaso (opcional, pero útil en docker)
RUN npm install -g ts-node-dev typescript

# 6. Copiar el resto del código
COPY . .

# Exponer el puerto (Ajusta si usas otro puerto que no sea 3000)
EXPOSE 3000

# Comando por defecto (Usamos el script de tu package.json)
CMD ["npm", "run", "dev"]