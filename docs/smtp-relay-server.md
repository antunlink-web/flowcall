# SMTP HTTP Relay Server

A simple Node.js server to relay HTTP requests to SMTP. Deploy this on your mail.flowcall.eu server.

## Installation

```bash
# Create directory
mkdir smtp-relay && cd smtp-relay

# Initialize and install dependencies
npm init -y
npm install express nodemailer cors
```

## Create server.js

```javascript
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// SMTP Configuration - update these values
const SMTP_HOST = 'mail.flowcall.eu';
const SMTP_PORT = 465;
const SMTP_USER = 'accounts@flowcall.eu';
const SMTP_PASS = 'YOUR_PASSWORD_HERE';
const API_SECRET = 'your-secret-key-here'; // Set a strong secret

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true, // true for 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Send email endpoint
app.post('/send', async (req, res) => {
  // Verify API secret
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { to, subject, html, from } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  try {
    const result = await transporter.sendMail({
      from: from || SMTP_USER,
      to,
      subject,
      html,
    });

    console.log('Email sent:', result.messageId);
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SMTP Relay running on port ${PORT}`);
});
```

## Run the server

```bash
# Development
node server.js

# Production with PM2
npm install -g pm2
pm2 start server.js --name smtp-relay
pm2 save
pm2 startup
```

## Test it

```bash
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key-here" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello!</h1><p>This is a test.</p>"
  }'
```

## Expose via HTTPS

Use nginx as reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name relay.flowcall.eu;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Update FlowCall Edge Functions

Once your relay is running at `https://relay.flowcall.eu`, add these secrets in Lovable:
- `SMTP_RELAY_URL`: https://relay.flowcall.eu
- `SMTP_RELAY_SECRET`: your-secret-key-here

Then the edge functions will use HTTP to call your relay instead of direct SMTP.
