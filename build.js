// Gera as páginas publicadas a partir de src/index.html, com o JSX já compilado
// (o celular não precisa baixar o Babel nem compilar a cada abertura).
// Uso: npm install && npm run build
const fs = require("fs");
const Babel = require("@babel/standalone");

const src = fs.readFileSync("src/index.html", "utf8");
const m = src.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!m) throw new Error("Bloco <script type=\"text/babel\"> não encontrado");
const js = Babel.transform(m[1], { presets: ["react"], minified: true, comments: false }).code;

const page = src
  .replace(m[0], () => `<script>${js}</script>`)
  .replace(/<script src="[^"]*babel-standalone[^"]*"><\/script>\n?/, "")
  .replace("<!-- BUILD -->", "<!-- Gerado por build.js a partir de src/index.html. Não edite. -->");

const hml = page
  .replace('href="manifest.json"', 'href="../manifest.json"')
  .replace(/href="icon-192.png"/g, 'href="../icon-192.png"')
  .replace("<title>CPC - ", "<title>[HML] CPC - ");

fs.writeFileSync("index.html", page);
fs.mkdirSync("homolog", { recursive: true });
fs.writeFileSync("homolog/index.html", hml);
console.log(`index.html ${page.length} bytes, homolog/index.html ${hml.length} bytes`);
