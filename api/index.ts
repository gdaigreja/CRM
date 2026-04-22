// import app from '../server'; // COMENTADO PARA TESTE

export default async function handler(req: any, res: any) {
  return res.status(200).json({ 
    status: "ok", 
    message: "A infraestrutura da Vercel está funcionando!",
    env: process.env.VERCEL === '1' ? 'Produção (Vercel)' : 'Local'
  });
}
