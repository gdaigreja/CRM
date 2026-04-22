import app from '../server';

export default async function handler(req: any, res: any) {
  // Diagnóstico simples
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({ 
      status: "ok", 
      message: "API está online e conectada ao servidor principal!",
      env: process.env.VERCEL === '1' ? 'Produção (Vercel)' : 'Local'
    });
  }

  // Encaminha para o app Express (server.ts)
  return app(req, res);
}
