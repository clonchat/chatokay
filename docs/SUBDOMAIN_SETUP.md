# Configuración de Subdominios

Este documento explica cómo configurar y acceder a los subdominios del chatbot tanto en desarrollo local como en producción.

## Desarrollo Local

### Configurar subdominios locales

Para probar subdominios en local, necesitas modificar tu archivo `hosts` del sistema:

#### Windows

1. Abre el Bloc de notas como Administrador
2. Abre el archivo: `C:\Windows\System32\drivers\etc\hosts`
3. Añade estas líneas:

```
127.0.0.1 polimar.localhost
127.0.0.1 tunegocio.localhost
```

4. Guarda el archivo

#### macOS/Linux

1. Abre la terminal
2. Ejecuta: `sudo nano /etc/hosts`
3. Añade estas líneas:

```
127.0.0.1 polimar.localhost
127.0.0.1 tunegocio.localhost
```

4. Guarda con Ctrl+O y sal con Ctrl+X

### Acceder al chatbot en local

Una vez configurado el archivo hosts:

1. Inicia tu servidor de desarrollo: `pnpm dev`
2. Accede a: `http://polimar.localhost:3000`
3. Verás el chatbot del negocio con subdominio "polimar"

**Nota:** Reemplaza "polimar" con el subdominio que configuraste en el onboarding.

## Producción

### Configuración de DNS en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a Settings > Domains
3. Añade tu dominio principal: `chatokay.com`
4. Añade un wildcard domain: `*.chatokay.com`
5. Configura los registros DNS según las instrucciones de Vercel

### Registros DNS requeridos

En tu proveedor de DNS (por ejemplo, Cloudflare, Namecheap, etc.):

#### Para el dominio principal (chatokay.com)

```
Type: A
Name: @
Value: 76.76.21.21 (IP de Vercel)
```

o

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

#### Para subdominios (\*.chatokay.com)

```
Type: A
Name: *
Value: 76.76.21.21 (IP de Vercel)
```

o

```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

### Acceder al chatbot en producción

Una vez configurado:

1. El dashboard estará en: `https://chatokay.com`
2. Cada chatbot estará en: `https://[subdominio].chatokay.com`
3. Ejemplo: `https://polimar.chatokay.com`

## Funcionamiento del Sistema

### Middleware

El middleware (`apps/web/middleware.ts`) detecta automáticamente:

1. **Dominio principal** (chatokay.com o localhost:3000):
   - Muestra el dashboard y páginas de autenticación
   - Requiere autenticación para rutas protegidas

2. **Subdominios** (_.chatokay.com o _.localhost:3000):
   - Reescribe la URL a `/chat/[subdomain]`
   - Es público (no requiere autenticación)
   - Muestra el chatbot del negocio

### Flujo de Datos

1. Usuario accede a `polimar.chatokay.com`
2. Middleware detecta el subdominio "polimar"
3. Reescribe internamente a `/chat/polimar`
4. La página llama a `/api/business/polimar`
5. API consulta Convex por el negocio con subdomain="polimar"
6. Retorna datos públicos del negocio
7. Se renderiza el chatbot personalizado

## Troubleshooting

### El subdominio local no funciona

- Verifica que modificaste correctamente el archivo `hosts`
- Reinicia el navegador después de cambiar el archivo hosts
- Asegúrate de usar `http://` y no `https://` en local
- El puerto debe ser el mismo: `:3000`

### El subdominio en producción no funciona

- Verifica que los registros DNS estén configurados correctamente
- Los cambios DNS pueden tardar hasta 48 horas (normalmente minutos)
- Usa herramientas como `https://dnschecker.org/` para verificar propagación
- Asegúrate de haber añadido el wildcard domain en Vercel

### Error 404 en el chatbot

- Verifica que el negocio existe en la base de datos
- Confirma que el subdomain esté guardado correctamente
- Revisa los logs de Convex para errores

### Problemas de CORS

- Verifica que `next.config.mjs` tenga los headers CORS configurados
- En producción, Vercel maneja esto automáticamente

## Seguridad

- Los subdominios son públicos por diseño
- No se requiere autenticación para ver el chatbot
- Solo se expone información pública del negocio
- Los endpoints privados siguen protegidos por Clerk

## Enlaces Útiles

- [Documentación de Next.js sobre Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Wildcard Domains en Vercel](https://vercel.com/docs/concepts/projects/domains/wildcard-domains)
- [DNS Checker](https://dnschecker.org/)
