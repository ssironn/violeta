import { GraduationCap, FileText, ClipboardList, BookOpen, FlaskConical, ListChecks, ClipboardCheck, ScrollText, Search, BookMarked } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface DocumentTemplate {
  id: string
  title: string
  description: string
  icon: LucideIcon
  category: string
  latexSource: string
}

export const templateCategories = [
  { id: 'academicos', label: 'Acadêmicos' },
  { id: 'exercicios', label: 'Exercícios / Provas' },
  { id: 'trabalhos', label: 'Trabalhos' },
]

export const documentTemplates: DocumentTemplate[] = [
  // ── Acadêmicos ──
  {
    id: 'artigo-academico',
    title: 'Artigo Acadêmico',
    description: 'Título, autor, resumo, abstract, seções e referências',
    icon: GraduationCap,
    category: 'academicos',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{Título do Artigo}
\\author{Nome do Autor \\\\ Instituição \\\\ \\texttt{email@exemplo.com}}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Escreva aqui o resumo do seu artigo em português. O resumo deve conter entre 150 e 250 palavras, apresentando o objetivo, a metodologia, os principais resultados e as conclusões do trabalho.
\\end{abstract}

\\textbf{Palavras-chave:} palavra1; palavra2; palavra3.

\\section{Introdução}

Apresente aqui o contexto do trabalho, o problema de pesquisa e os objetivos.

\\section{Fundamentação Teórica}

Revise a literatura relevante sobre o tema.

\\section{Metodologia}

Descreva os métodos utilizados na pesquisa.

\\section{Resultados e Discussão}

Apresente e discuta os resultados obtidos.

\\section{Conclusão}

Sintetize as principais contribuições e aponte trabalhos futuros.

\\begin{thebibliography}{99}
\\bibitem{ref1} SOBRENOME, Nome. \\textit{Título da obra}. Editora, Ano.
\\end{thebibliography}

\\end{document}`,
  },
  {
    id: 'tcc-monografia',
    title: 'TCC / Monografia',
    description: 'Capa, sumário, capítulos e referências',
    icon: BookOpen,
    category: 'academicos',
    latexSource: `\\documentclass[12pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{left=3cm,right=2cm,top=3cm,bottom=2cm}
\\usepackage{setspace}
\\onehalfspacing

\\begin{document}

% ── Capa ──
\\begin{titlepage}
\\centering
\\vspace*{2cm}
{\\Large Universidade XYZ}\\\\[0.5cm]
{\\large Curso de Exemplo}\\\\[3cm]
{\\LARGE\\bfseries Título do Trabalho de Conclusão de Curso}\\\\[2cm]
{\\large Nome do Autor}\\\\[4cm]
{\\large Cidade}\\\\
{\\large \\the\\year}
\\end{titlepage}

\\tableofcontents
\\newpage

\\chapter{Introdução}

Apresente o tema, o problema, os objetivos e a justificativa do trabalho.

\\section{Objetivos}
\\subsection{Objetivo Geral}
Descreva o objetivo geral.

\\subsection{Objetivos Específicos}
\\begin{itemize}
  \\item Objetivo específico 1
  \\item Objetivo específico 2
  \\item Objetivo específico 3
\\end{itemize}

\\chapter{Revisão de Literatura}

Apresente a fundamentação teórica do trabalho.

\\chapter{Metodologia}

Descreva os procedimentos metodológicos adotados.

\\chapter{Resultados e Discussão}

Apresente e analise os resultados obtidos.

\\chapter{Conclusão}

Sintetize as conclusões e sugira trabalhos futuros.

\\begin{thebibliography}{99}
\\bibitem{ref1} SOBRENOME, Nome. \\textit{Título da obra}. Editora, Ano.
\\end{thebibliography}

\\end{document}`,
  },
  {
    id: 'relatorio-tecnico',
    title: 'Relatório Técnico',
    description: 'Seções técnicas, figuras e tabelas',
    icon: FileText,
    category: 'academicos',
    latexSource: `\\documentclass[12pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{graphicx}
\\usepackage{booktabs}

\\title{Relatório Técnico}
\\author{Nome do Autor \\\\ Departamento / Instituição}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents
\\newpage

\\section{Introdução}

Descreva o contexto e os objetivos deste relatório técnico.

\\section{Descrição do Problema}

Detalhe o problema ou situação analisada.

\\section{Desenvolvimento}

\\section{Análise}
Apresente a análise técnica realizada.

\\section{Resultados}
Descreva os resultados obtidos.

\\begin{table}[h]
\\centering
\\caption{Exemplo de tabela de resultados}
\\begin{tabular}{lcc}
\\toprule
\\textbf{Parâmetro} & \\textbf{Valor} & \\textbf{Unidade} \\\\
\\midrule
Parâmetro 1 & 10,5 & m/s \\\\
Parâmetro 2 & 25,3 & kg \\\\
\\bottomrule
\\end{tabular}
\\end{table}

\\section{Conclusões e Recomendações}

Apresente as conclusões e recomendações técnicas.

\\end{document}`,
  },
  {
    id: 'resumo-academico',
    title: 'Resumo Acadêmico',
    description: 'Artigo curto com estrutura de resumo/resenha',
    icon: ScrollText,
    category: 'academicos',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\title{Resumo: Título da Obra}
\\author{Nome do Autor}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{Referência}

SOBRENOME, Nome. \\textit{Título da obra}. Cidade: Editora, Ano. p. XX--YY.

\\section*{Resumo}

Apresente aqui as ideias principais do texto lido, de forma objetiva e concisa.

\\section*{Análise Crítica}

Faça uma avaliação crítica do texto, apontando pontos fortes, limitações e sua relevância para o tema estudado.

\\section*{Considerações Finais}

Sintetize suas impressões gerais sobre a obra.

\\end{document}`,
  },

  // ── Exercícios / Provas ──
  {
    id: 'lista-exercicios',
    title: 'Lista de Exercícios',
    description: 'Estrutura enumerada com questões',
    icon: ListChecks,
    category: 'exercicios',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{enumitem}

\\begin{document}

\\begin{center}
{\\Large\\bfseries Lista de Exercícios}\\\\[0.3cm]
{\\large Disciplina -- Professor(a)}\\\\[0.2cm]
{\\normalsize Data de entrega: \\_\\_/\\_\\_/\\_\\_\\_\\_}
\\end{center}

\\vspace{0.5cm}
\\hrule
\\vspace{0.5cm}

\\begin{enumerate}[label=\\textbf{\\arabic*.}]

\\item Enunciado da primeira questão.

\\item Enunciado da segunda questão.
\\begin{enumerate}[label=\\alph*)]
  \\item Item a
  \\item Item b
  \\item Item c
\\end{enumerate}

\\item Enunciado da terceira questão. Considere a equação:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

\\item Enunciado da quarta questão.

\\item Enunciado da quinta questão.

\\end{enumerate}

\\end{document}`,
  },
  {
    id: 'prova-exame',
    title: 'Prova / Exame',
    description: 'Cabeçalho com nome/data, questões com pontuação',
    icon: ClipboardList,
    category: 'exercicios',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2cm}
\\usepackage{enumitem}

\\begin{document}

\\begin{center}
{\\Large\\bfseries Prova de Disciplina}\\\\[0.3cm]
{\\normalsize Professor(a): Nome do Professor}\\\\[0.2cm]
{\\normalsize Data: \\_\\_/\\_\\_/\\_\\_\\_\\_ \\hspace{1cm} Turma: \\_\\_\\_\\_\\_}
\\end{center}

\\vspace{0.3cm}
\\noindent\\textbf{Nome:} \\hrulefill \\hspace{0.5cm} \\textbf{Matrícula:} \\underline{\\hspace{3cm}}

\\vspace{0.2cm}
\\noindent\\textbf{Instruções:}
\\begin{itemize}[nosep]
  \\item Duração: 2 horas
  \\item Prova sem consulta
  \\item Justifique todas as respostas
\\end{itemize}

\\vspace{0.3cm}
\\hrule
\\vspace{0.5cm}

\\noindent\\textbf{Questão 1} (2,0 pontos)\\\\
Enunciado da primeira questão.

\\vspace{3cm}

\\noindent\\textbf{Questão 2} (2,5 pontos)\\\\
Enunciado da segunda questão.

\\vspace{3cm}

\\noindent\\textbf{Questão 3} (2,5 pontos)\\\\
Enunciado da terceira questão.

\\vspace{3cm}

\\noindent\\textbf{Questão 4} (3,0 pontos)\\\\
Enunciado da quarta questão.

\\end{document}`,
  },
  {
    id: 'gabarito',
    title: 'Gabarito',
    description: 'Prova com espaço para respostas',
    icon: ClipboardCheck,
    category: 'exercicios',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\newcommand{\\resposta}[1]{\\textcolor{blue}{\\textbf{Resposta:} #1}}

\\begin{document}

\\begin{center}
{\\Large\\bfseries Gabarito -- Prova de Disciplina}\\\\[0.3cm]
{\\normalsize Professor(a): Nome do Professor}\\\\[0.2cm]
{\\normalsize Data: \\_\\_/\\_\\_/\\_\\_\\_\\_}
\\end{center}

\\vspace{0.5cm}
\\hrule
\\vspace{0.5cm}

\\noindent\\textbf{Questão 1} (2,0 pontos)\\\\
Enunciado da primeira questão.

\\resposta{Escreva aqui a resposta da questão 1.}

\\vspace{0.5cm}

\\noindent\\textbf{Questão 2} (2,5 pontos)\\\\
Enunciado da segunda questão.

\\resposta{Escreva aqui a resposta da questão 2.}

\\vspace{0.5cm}

\\noindent\\textbf{Questão 3} (2,5 pontos)\\\\
Enunciado da terceira questão.

\\resposta{Escreva aqui a resposta da questão 3.}

\\vspace{0.5cm}

\\noindent\\textbf{Questão 4} (3,0 pontos)\\\\
Enunciado da quarta questão.

\\resposta{Escreva aqui a resposta da questão 4.}

\\end{document}`,
  },

  // ── Trabalhos ──
  {
    id: 'trabalho-faculdade',
    title: 'Trabalho de Faculdade',
    description: 'Capa, introdução, desenvolvimento e conclusão',
    icon: FlaskConical,
    category: 'trabalhos',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{geometry}
\\geometry{left=3cm,right=2cm,top=3cm,bottom=2cm}
\\usepackage{setspace}
\\onehalfspacing

\\begin{document}

% ── Capa ──
\\begin{titlepage}
\\centering
\\vspace*{2cm}
{\\Large Universidade XYZ}\\\\[0.5cm]
{\\large Curso de Exemplo}\\\\[3cm]
{\\LARGE\\bfseries Título do Trabalho}\\\\[2cm]
{\\large Nome do Aluno}\\\\[0.5cm]
{\\large Disciplina: Nome da Disciplina}\\\\[0.5cm]
{\\large Professor(a): Nome do Professor}\\\\[3cm]
{\\large Cidade}\\\\
{\\large \\the\\year}
\\end{titlepage}

\\section{Introdução}

Apresente o tema, os objetivos e a organização do trabalho.

\\section{Desenvolvimento}

Desenvolva o tema proposto com argumentos fundamentados.

\\subsection{Primeiro Tópico}

Detalhe o primeiro aspecto do tema.

\\subsection{Segundo Tópico}

Detalhe o segundo aspecto do tema.

\\section{Conclusão}

Sintetize as ideias apresentadas e suas conclusões.

\\begin{thebibliography}{99}
\\bibitem{ref1} SOBRENOME, Nome. \\textit{Título da obra}. Editora, Ano.
\\end{thebibliography}

\\end{document}`,
  },
  {
    id: 'trabalho-pesquisa',
    title: 'Trabalho de Pesquisa',
    description: 'Metodologia, resultados e discussão',
    icon: Search,
    category: 'trabalhos',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{setspace}
\\onehalfspacing

\\title{Título do Trabalho de Pesquisa}
\\author{Nome do Autor \\\\ Instituição}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Resumo do trabalho de pesquisa, incluindo objetivo, metodologia, resultados e conclusões.
\\end{abstract}

\\section{Introdução}

Contextualize o problema de pesquisa e apresente os objetivos.

\\section{Revisão de Literatura}

Apresente os trabalhos relacionados e a fundamentação teórica.

\\section{Metodologia}

Descreva detalhadamente os métodos e procedimentos utilizados.

\\section{Resultados}

Apresente os dados e resultados obtidos.

\\section{Discussão}

Analise e interprete os resultados à luz da literatura.

\\section{Conclusão}

Sintetize as contribuições e aponte limitações e trabalhos futuros.

\\begin{thebibliography}{99}
\\bibitem{ref1} SOBRENOME, Nome. \\textit{Título da obra}. Editora, Ano.
\\end{thebibliography}

\\end{document}`,
  },
  {
    id: 'fichamento',
    title: 'Fichamento',
    description: 'Estrutura para fichamento de texto acadêmico',
    icon: BookMarked,
    category: 'trabalhos',
    latexSource: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazil]{babel}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\begin{document}

\\begin{center}
{\\Large\\bfseries Fichamento}\\\\[0.5cm]
\\end{center}

\\noindent\\textbf{Referência:}\\\\
SOBRENOME, Nome. \\textit{Título da obra}. Cidade: Editora, Ano. p. XX--YY.

\\vspace{0.5cm}

\\noindent\\textbf{Tipo de fichamento:} Bibliográfico / Citação / Resumo / Crítico

\\vspace{0.5cm}
\\hrule
\\vspace{0.5cm}

\\noindent\\textbf{1. Ideia principal}

Descreva a ideia central do texto.

\\vspace{0.5cm}

\\noindent\\textbf{2. Citações relevantes}

\\begin{quote}
\`\`Insira aqui uma citação direta do texto.'' (SOBRENOME, Ano, p. XX)
\\end{quote}

\\begin{quote}
\`\`Outra citação relevante.'' (SOBRENOME, Ano, p. YY)
\\end{quote}

\\vspace{0.5cm}

\\noindent\\textbf{3. Resumo dos argumentos}

Sintetize os principais argumentos apresentados pelo autor.

\\vspace{0.5cm}

\\noindent\\textbf{4. Análise crítica}

Apresente sua avaliação sobre o texto, pontos fortes e fracos.

\\vspace{0.5cm}

\\noindent\\textbf{5. Relação com o tema de pesquisa}

Como este texto se relaciona com seu trabalho ou tema de estudo?

\\end{document}`,
  },
]
