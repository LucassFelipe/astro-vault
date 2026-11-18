# AstroVault

Catálogo pessoal de imagens e vídeos do acervo da NASA, com álbum de favoritos salvo no navegador. Trabalho para a disciplina de Programação de Sistemas Web na Universidade Estadual de Maringá.

## Sobre o projeto

O AstroVault consulta a **NASA Image and Video Library** e permite montar um álbum de imagens espaciais. A interface segue o formato de catálogo acadêmico: fichas numeradas, tipografia serifada e crédito da fonte.

## Funcionalidades

- Busca por termo livre, com filtro por imagem ou vídeo.
- Paginação com o botão **Carregar mais**.
- Favoritos marcados com o coração e reunidos na aba **Meu álbum**.
- Edição da anotação pessoal de cada favorito, pelo botão **Editar anotação**.
- Ficha detalhada de cada registro, com imagem ou player de vídeo.
- Persistência do álbum entre recarregamentos da página.

## Tecnologias

HTML5, CSS3 e JavaScript puro. Não há dependências nem chave de API.

## Fonte dos dados

Os registros vêm de `https://images-api.nasa.gov/search`, API pública da NASA. Para vídeos, o arquivo MP4 é obtido do `collection.json` indicado no próprio resultado da busca. As mídias são sempre carregadas diretamente dos servidores da NASA.

## Armazenamento

O álbum usa `localStorage` apenas para metadados em texto: identificador, título, descrição resumida, data, tipo, caminho da miniatura e anotação pessoal. Nenhuma imagem ou vídeo é salvo no navegador, o que evita o limite de cerca de 5 MB do `localStorage`.