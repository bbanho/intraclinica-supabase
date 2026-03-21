#!/bin/bash
set -e

echo "🚀 Iniciando Build Unificado (IntraClinica + Documentação)..."

# 1. Compilar o Frontend Angular
echo "📦 Compilando o Frontend Angular..."
cd frontend
npm ci
npm run build -- --configuration=production
cd ..

# 2. Integrar a Documentação
echo "📄 Integrando a pasta /documentacao..."
mkdir -p frontend/dist/documentacao
cp -r documentacao/* frontend/dist/documentacao/

# 3. (Opcional) Se tiver pdflatex instalado no ambiente de build, compilar os PDFs aqui:
# cd documentacao && pdflatex intraclinica-master-report.tex && cp intraclinica-master-report.pdf ../frontend/dist/documentacao/ && cd ..

echo "✅ Build finalizado! Diretório de saída pronto em: frontend/dist/"
