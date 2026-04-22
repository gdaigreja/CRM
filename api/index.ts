let app;

try {
  console.log("Vercel Function: Iniciando importação do servidor...");
  const serverModule = await import('../server');
  app = serverModule.default;
  console.log("Vercel Function: Servidor importado com sucesso.");
} catch (e: any) {
  console.error("Vercel Function FATAL ERROR:", e);
  app = (req: any, res: any) => {
    res.status(500).json({ 
      error: "O servidor falhou ao iniciar na Vercel", 
      details: e.message,
      path: req.url
    });
  };
}

// Endpoint de teste rápido para isolar problemas de infra
const handler = (req: any, res: any) => {
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({ status: "ok", message: "Infraestrutura da API funcionando" });
  }
  return app(req, res);
};

export default handler;
