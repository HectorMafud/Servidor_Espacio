# Servidor_Espacio

Backend de pagos para Espacio en Red.

## Rutas

- `GET /` verifica que el servidor este activo.
- `POST /create-checkout-session` crea una sesion de Stripe Checkout.

El endpoint de checkout publicado en Render es:

```txt
https://servidor-espacio-1.onrender.com/create-checkout-session
```

## Variables en Render

Configura estas variables en `Render > Environment` del backend:

```txt
STRIPE_SECRET_KEY=sk_test_o_live_...
STRIPE_CURRENCY=mxn
CORS_ORIGIN=https://espacio-en-red.onrender.com
FRONTEND_URL=https://espacio-en-red.onrender.com
CHECKOUT_SUCCESS_URL=https://espacio-en-red.onrender.com/pago-exitoso
CHECKOUT_CANCEL_URL=https://espacio-en-red.onrender.com/pago-cancelado
```

Si el frontend real tiene otro dominio, usa ese dominio exacto. No dejes
`https://tu-frontend.com`, porque el navegador bloqueara la llamada por CORS.

`CORS_ORIGIN`, `FRONTEND_URL` y `CLIENT_URL` aceptan una lista separada por comas
si necesitas permitir mas de un origen.
