let app;
try {
  // Em ESM, precisamos da extensão .js para importações locais
  const serverModule = await import('../server.js');
  app = serverModule.default;
} catch (e: any) {
  app = (req: any, res: any) => {
    res.status(500).json({ 
      error: "O servidor falhou ao iniciar na Vercel", 
      message: e.message,
      stack: e.stack,
      node: process.version
    });
  };
}

export default app;
