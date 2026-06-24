require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const port = process.env.PORT || 3000;
const commissionRate = 0.1;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const corsOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.NODE_ENV !== "production" ? "http://localhost:5173" : "",
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!stripeSecretKey) {
  console.warn("Missing STRIPE_SECRET_KEY environment variable.");
}

const stripe = Stripe(stripeSecretKey || "sk_test_missing");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Servidor_Espacio" });
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Stripe secret key is not configured." });
    }

    const rentalAmount = Number(req.body.amount);
    const currency = process.env.STRIPE_CURRENCY || "mxn";
    const spaceName = req.body.spaceName || "Renta de espacio";
    const successUrl = getAllowedRedirectUrl(
      req.body.successUrl,
      process.env.CHECKOUT_SUCCESS_URL || "http://localhost:5173/pago-exitoso"
    );
    const cancelUrl = getAllowedRedirectUrl(
      req.body.cancelUrl,
      process.env.CHECKOUT_CANCEL_URL || "http://localhost:5173/pago-cancelado"
    );

    if (!Number.isInteger(rentalAmount) || rentalAmount < 1000) {
      return res.status(400).json({
        error: "A valid amount in cents is required. Example: 150000 for $1,500.00 MXN.",
      });
    }

    const commissionAmount = Math.round(rentalAmount * commissionRate);
    const totalAmount = rentalAmount + commissionAmount;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: spaceName,
            },
            unit_amount: rentalAmount,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency,
            product_data: {
              name: "Comision de servicio 10%",
            },
            unit_amount: commissionAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        rental_amount: String(rentalAmount),
        commission_amount: String(commissionAmount),
        total_amount: String(totalAmount),
        commission_rate: "10%",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({
      url: session.url,
      rentalAmount,
      commissionAmount,
      totalAmount,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: "Could not create checkout session." });
  }
});

app.listen(port, () => {
  console.log(`Servidor_Espacio listening on port ${port}`);
});

function getAllowedRedirectUrl(candidateUrl, fallbackUrl) {
  if (!candidateUrl) {
    return fallbackUrl;
  }

  try {
    const url = new URL(candidateUrl);

    if (corsOrigins.includes(url.origin)) {
      return candidateUrl;
    }
  } catch (_error) {
    return fallbackUrl;
  }

  return fallbackUrl;
}
