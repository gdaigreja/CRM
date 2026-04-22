import app from './app.js';

export default async function handler(req: any, res: any) {
  try {
    // Diagnóstico
    if (req.url === '/api/health' || req.url === '/health') {
      return res.status(200).json({ 
        status: "ok", 
        message: "API na pasta /api está funcionando!",
        serverLoaded: !!app
      });
    }

    return app(req, res);
  } catch (error: any) {
    console.error("ERRO CRÍTICO NO HANDLER:", error);
    return res.status(500).json({ 
      error: "O servidor falhou ao processar a requisição", 
      details: error.message,
      stack: error.stack 
    });
  }
}
