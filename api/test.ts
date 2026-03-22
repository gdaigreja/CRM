export default function handler(req: any, res: any) {
  res.status(200).json({ 
    message: "API está funcionando!",
    node_version: process.version,
    zeit_env: process.env.VERCEL ? "sim" : "não"
  });
}
