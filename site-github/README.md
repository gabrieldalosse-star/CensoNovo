# Censo Esportivo de Votorantim

Portal estático com panorama, participantes, mapa territorial, gestão de importações e tour guiado. Interface em português, responsiva, com azul, dourado e verde inspirados no VotoEsporte.

## Comece aqui

Este pacote tem duas partes. **Publique somente a pasta `site-github`. A pasta `dados-privados` contém nomes, contatos e coordenadas de participantes e não deve ser enviada ao GitHub ou a uma hospedagem pública.**

1. Crie um repositório separado para o censo, evitando substituir o VotoEsporte existente.
2. Envie o conteúdo de `site-github` ao repositório. Configure GitHub Pages com GitHub Actions. O workflow incluído publica apenas `public/`.
3. O panorama abre imediatamente com indicadores agregados reais. Nenhuma base nominal é incluída em `public/`.
4. Para explorar todos os filtros, fichas e pontos, abra **Visão de gestão**, selecione `dados-privados/base-censo.json`, confira e clique **Aplicar novos registros**. Essa operação lê o arquivo apenas na memória da aba, sem enviá-lo à nuvem.
5. Antes de fechar a aba, baixe um backup privado caso tenha feito alterações. Para acesso compartilhado, configure o Firestore conforme abaixo.

## Prévia local

Com Node.js instalado, dentro de `site-github`, execute `node serve.mjs` e abra http://127.0.0.1:8765 . O servidor serve exclusivamente a pasta pública. Abrir o HTML por duplo clique não funciona por causa das restrições dos módulos e fetch em `file://`.

## Funcionalidades

- Panorama com indicadores, gráficos em rosca, modalidades e bairros. As legendas e barras públicas abrem a leitura do indicador. Na base privada elas aplicam filtros combináveis.
- Filtros de modalidade, bairro, gênero, faixa etária, cidade, local, turma, PCD, coordenadas e status. Os critérios de matrícula precisam pertencer à mesma matrícula.
- Lista paginada de participantes, busca, ordenação, ficha completa, exportação CSV e navegação para a coordenada no mapa.
- Mapa Leaflet com 76 áreas de referência, limite municipal, pessoas e mapa de calor. Coordenadas coincidentes são agrupadas com contagem e lista, sem criar deslocamentos fictícios. A camada de bairros conta nomes cadastrais correspondentes, não inclusão geométrica.
- Importação XLSM/XLSX ou JSON com conferência antes de aplicar. As macros não são executadas. Os cadastros existentes são preservados. IDs diferentes com mesmo nome e nascimento são reconhecidos. Homônimos e IDs em conflito ficam fora da aplicação e podem ser baixados para revisão.
- Tour com cinco capítulos, reprodução automática pausável, tela cheia e links para explorar cada assunto. Respeita preferência por redução de movimento.
- Relatório por impressão do navegador. A lista imprime somente a página visível; exporte CSV para obter a seleção completa.

## Origem dos dados e critérios

O anexo da conversa não pôde ser transferido por bloqueio de rede do ambiente. Foi utilizada a cópia homônima `DECIO_GEOLOCALIZACAO_REVISADA_12-11-2026.xlsm` no Google Drive, modificada em 12/11/2026 às 14:41:50 BRT:
https://docs.google.com/spreadsheets/d/13aMToFJ2xl-eo7jvfXEZ28HqQKa5YuOf/edit

Não foi possível verificar igualdade byte a byte com o anexo. Se houver diferença entre eles, importe o anexo original pela gestão para conferir a comparação antes de aplicar. Nenhuma planilha original foi modificada.

Controles da cópia lida:

| Medida | Quantidade |
|---|---:|
| Pessoas com nome na aba Alunos | 1.000 |
| Pessoas com coordenadas numéricas válidas | 998 |
| Linhas de matrícula com aluno | 2.210 |
| Repetições consolidadas por aluno/turma/dia/horário | 121 |
| Matrículas distintas no portal | 2.089 |
| Linhas sem nome de aluno ignoradas | 1.635 |
| Linhas sem aluno na aba Matrículas ignoradas | 1.922 |
| Bairros cadastrais, incluindo outros municípios | 120 |
| Turmas na origem | 126 |
| Locais na origem | 27 |

Participantes e matrículas são medidas diferentes. Repetições são consolidadas na leitura do portal, sem exclusão da origem. Há uma matrícula sem turma, preservada e registrada em `auditoria.json`. Coordenadas válidas não significam endereço conferido no terreno. Idade calculada até 31/12/2026 pelo nascimento válido; na ausência, mantém-se a idade informada quando disponível.

Malha de origem fixada no commit fornecido:
https://github.com/gabrieldalosse-star/votoesporte/tree/2ab67b45f083fb2b7b44994f33d8c4136ee0219d/data

`votorantim-bairros-mapa-leve.geojson` contém 76 áreas derivadas do CNEFE 2022 e dos setores censitários. Conforme os metadados, **não são limites legais de bairros**. Os 120 bairros cadastrais não correspondem necessariamente às 76 áreas. O portal não força equivalências entre nomes divergentes.

## Firebase e Firestore

A configuração pública real do projeto `vtesporte-d3b9d` foi copiada do repositório fornecido. Não contém chave de serviço. A configuração sozinha não concede autorização nem publica regras.

1. No Firebase Authentication, habilite Google e adicione o domínio do GitHub Pages aos domínios autorizados.
2. Faça backup das regras atuais do projeto. O arquivo `firestore.rules` deste pacote preserva o conteúdo do commit fornecido e acrescenta o namespace do censo. **Se as regras em produção mudaram desde esse commit, integre apenas `censo-rules-fragment.txt` às regras atuais, sem sobrescrevê-las.** O fragmento depende da função `isAdmin()` existente.
3. Revise no emulador antes de implantar. As regras da nuvem não foram implantadas nem testadas no emulador nesta execução.
4. Para implantar somente regras, com Firebase CLI autenticada: `firebase deploy --only firestore:rules --project vtesporte-d3b9d`. Não execute `firebase deploy` sem selecionar o alvo, pois isso também pode alterar a hospedagem existente.
5. Administradores já provisionados em `adminUsers/{UID}` podem administrar o censo. Também são aceitas custom claims `censoAdmin: true` e `censoReader: true`, atribuídas apenas pelo Admin SDK em ambiente confiável. Não há autopromoção pelo cliente. Não publique credenciais de serviço.
6. Entre na gestão. Se a nuvem ainda não tem uma base, importe `base-censo.json`, aplique e clique **Salvar no Firestore**. Se você abriu uma base local antes de entrar, feche-a para carregar o estado da nuvem antes de sincronizar.

As coleções são `censo_v1_config` e `censo_v1_snapshots`. A gravação cria um snapshot novo, em lotes de até 400 documentos, e atualiza o apontador de base ativa somente ao concluir, usando transação com verificação de concorrência. O snapshot anterior é mantido. Falhas antes da ativação podem deixar snapshots incompletos inativos, sem substituir a base ativa; a manutenção desses registros deve ser feita por administrador confiável. O cliente não pode editar ou apagar snapshots finalizados.

O resumo público é um arquivo estático, intencionalmente separado da base nominal. Depois de uma atualização, baixe **Indicadores públicos** e substitua `public/data/public-summary.json` no repositório para republicar os números. Salvar no Firestore não atualiza automaticamente o GitHub Pages.

## Segurança, limites e dependências

- Não inclui chave Admin SDK, CPF ou arquivos nominais na hospedagem pública. Contatos, nomes e pontos individuais só aparecem após abrir uma base local ou obter acesso autenticado.
- Dados importados ficam na memória da aba. Não há cache nominal em localStorage/IndexedDB. Saída da conta limpa a base visível.
- XLSM/XLSX são lidos com SheetJS 0.20.3, carregado somente ao importar Excel. JSON não precisa dessa biblioteca.
- Mapa carrega Leaflet 1.9.4 e Leaflet.heat 0.2.0 sob demanda, além de tiles OpenStreetMap. É preciso conexão para bibliotecas, tiles e autenticação.
- Firebase JS 12.5.0 é carregado somente ao entrar. CSP limita origens externas. Exportação CSV neutraliza prefixos de fórmulas.
- Importação limitada a 20 MB; JSON a 25 mil participantes e 100 mil matrículas. A aplicação carrega a base privada completa em memória; bases grandes exigem evolução para paginação no servidor.
- A ilustração do cabeçalho é artística, gerada para este projeto. Não é uma representação cartográfica real. Logo substituída pelo brasão de Votorantim, incorporado do arquivo local Brasao_de_Votorantim_SP_4000px.png, conforme solicitado. O brasão foi convertido para WebP sem perdas, com igualdade de pixels RGBA verificada, sem redesenho.

Referências técnicas: https://docs.sheetjs.com/docs/getting-started/installation/standalone/ ; https://leafletjs.com/examples/choropleth/ ; https://firebase.google.com/docs/rules/rules-and-auth .

## Validação realizada

Oito testes automatizados de controles da base, reimportação, conflitos, identidade por nascimento, correlação de filtros, filtros reais, datas/CSV e ausência de campos nominais no resumo público. Verificação de sintaxe dos módulos. Prévia aberta no Chrome: panorama e mapa territorial visualmente revisados, navegação do tour testada entre capítulos. Autenticação, gravação real no Firestore e regras em emulador dependem da configuração do projeto e não foram executadas.
