require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const port = process.env.PORT || 4242;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(stripeSecretKey || "missing_key");

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function createCheckoutSession(req, res) {
  try {
    const {
      spaceId,
      title,
      amount,
      unitAmount,
      currency = "mxn",
      hours,
      date,
      customerEmail,
      userId,
      successUrl,
      cancelUrl,
    } = req.body;

    if (!stripeSecretKey) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY is not configured." });
    }

    if (!title || !amount || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: "Missing required fields: title, amount, successUrl, cancelUrl.",
      });
    }

    const finalAmount = Number(amount);

    if (!Number.isFinite(finalAmount) || finalAmount < 50) {
      return res.status(400).json({ error: "Invalid amount." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: finalAmount,
            product_data: {
              name: title,
              metadata: {
                spaceId: spaceId || "",
                userId: userId || "",
                hours: String(hours || ""),
                date: date || "",
                unitAmount: String(unitAmount || ""),
              },
            },
          },
        },
      ],
      metadata: {
        spaceId: spaceId || "",
        userId: userId || "",
        hours: String(hours || ""),
        date: date || "",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({
      error: error.message || "Could not create checkout session.",
    });
  }
}

app.post("/create-checkout-session", createCheckoutSession);
app.post("/api/create-checkout-session", createCheckoutSession);

app.listen(port, () => {
  console.log(`Payments server listening on port ${port}`);
});
