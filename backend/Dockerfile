# Dockerfile para ROMEDICALS+ Backend
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    mysql-client \
    bash \
    curl

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY env.example ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads backups logs

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S romedicals -u 1001

# Cambiar permisos
RUN chown -R romedicals:nodejs /app
USER romedicals

# Exponer puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Comando por defecto
CMD ["npm", "start"]
