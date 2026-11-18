const API_NASA = "https://images-api.nasa.gov/search";
const CHAVE_FAVORITOS = "astrovault:favorites:v1";
const POR_PAGINA = 20;

let estado = {
    termo: "nebula",
    tipo: "todos",
    pagina: 1,
    itens: [],
    favoritos: []
};

let sequencia = 0;

function avisar(texto) {
    let elemento = document.getElementById("estado");
    if (elemento) elemento.textContent = texto;
}

function limparEntidades(texto) {
    return String(texto == null ? "" : texto)
        .replace(/&quot;/g, "\"")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");
}

function montarItem(registro) {
    let dados = registro && registro.data && registro.data[0];
    if (!dados || !dados.nasa_id) return null;

    let links = Array.isArray(registro.links) ? registro.links : [];
    let miniatura = links.find(function (link) {
        return link.rel === "preview" && link.render === "image";
    }) || links.find(function (link) {
        return link.render === "image";
    });

    return {
        id: String(dados.nasa_id),
        titulo: limparEntidades(dados.title || dados.nasa_id).trim(),
        descricao: limparEntidades(dados.description || dados.description_508 || "").trim().slice(0, 600),
        data: String(dados.date_created || "").slice(0, 10),
        tipo: dados.media_type === "video" ? "video" : "image",
        miniatura: miniatura && miniatura.href ? encodeURI(String(miniatura.href)) : null,
        ficha: registro.href ? encodeURI(String(registro.href)) : null
    };
}

function montarEndereco(termo, tipo, pagina) {
    let parametros = new URLSearchParams({ q: termo || "", page: String(pagina || 1) });
    if (tipo === "image" || tipo === "video") parametros.set("media_type", tipo);
    return API_NASA + "?" + parametros.toString();
}

async function buscar(pagina, reiniciar) {
    let atual = ++sequencia;
    let botaoMais = document.getElementById("carregar-mais");
    if (botaoMais) botaoMais.disabled = true;
    avisar("Consultando o acervo…");

    let conteudo;
    try {
        let resposta = await fetch(montarEndereco(estado.termo, estado.tipo, pagina));
        if (!resposta.ok) throw new Error("Erro HTTP: " + resposta.status);
        conteudo = await resposta.json();
    } catch (erro) {
        if (atual === sequencia) avisar("Não foi possível consultar a NASA. Verifique a conexão e tente de novo.");
        if (botaoMais) botaoMais.disabled = false;
        return;
    }

    if (atual !== sequencia) return;

    let registros = (conteudo.collection && conteudo.collection.items) || [];
    let vistos = new Set(reiniciar ? [] : estado.itens.map(function (item) { return item.id; }));
    let novos = [];
    for (let i = 0; i < registros.length; i++) {
        let item = montarItem(registros[i]);
        if (item && !vistos.has(item.id)) {
            vistos.add(item.id);
            novos.push(item);
        }
    }

    estado.itens = reiniciar ? novos : estado.itens.concat(novos);
    estado.pagina = pagina;
    mostrarTudo();
    if (botaoMais) {
        botaoMais.hidden = novos.length < POR_PAGINA;
        botaoMais.disabled = false;
    }
    avisar(estado.itens.length
        ? estado.itens.length + " registro(s) para “" + (estado.termo || "todos") + "”."
        : "Nenhum registro encontrado. Tente outro termo.");
}

function avisoImagem(texto) {
    let elemento = document.createElement("div");
    elemento.className = "sem-miniatura";
    elemento.textContent = texto;
    return elemento;
}

function mostrarCartoes(itens, local, modo) {
    if (!local) return;
    let fragmento = document.createDocumentFragment();

    for (let i = 0; i < itens.length; i++) {
        let item = itens[i];
        let cartao = document.createElement("article");
        cartao.className = "cartao";

        let abrir = document.createElement("button");
        abrir.type = "button";
        abrir.className = "cartao-abrir";
        abrir.addEventListener("click", function () { abrirDetalhe(item); });

        if (item.miniatura) {
            let imagem = document.createElement("img");
            imagem.className = "miniatura";
            imagem.src = item.miniatura;
            imagem.alt = item.titulo;
            imagem.loading = "lazy";
            imagem.addEventListener("error", function () {
                imagem.replaceWith(avisoImagem("Miniatura indisponível"));
            });
            abrir.appendChild(imagem);
        } else {
            abrir.appendChild(avisoImagem("Sem miniatura"));
        }

        if (item.tipo === "video") {
            let etiqueta = document.createElement("span");
            etiqueta.className = "etiqueta";
            etiqueta.textContent = "Vídeo";
            abrir.appendChild(etiqueta);
        }

        let corpo = document.createElement("div");
        corpo.className = "cartao-corpo";
        let titulo = document.createElement("h3");
        titulo.textContent = item.titulo;
        let data = document.createElement("p");
        data.textContent = item.data || (modo === "album" ? "Guardado no álbum" : "NASA");
        corpo.appendChild(titulo);
        corpo.appendChild(data);

        if (item.anotacao) {
            let nota = document.createElement("p");
            nota.className = "anotacao";
            nota.textContent = item.anotacao;
            corpo.appendChild(nota);
        }

        if (modo === "album") {
            let editar = document.createElement("button");
            editar.type = "button";
            editar.className = "botao-editar";
            editar.textContent = "Editar anotação";
            editar.addEventListener("click", function () { editarAnotacao(item); });
            corpo.appendChild(editar);
        }

        let favorito = document.createElement("button");
        favorito.type = "button";
        favorito.className = "botao-favorito";
        let salvo = estado.favoritos.some(function (guardado) { return guardado.id === item.id; });
        favorito.textContent = salvo ? "♥" : "♡";
        favorito.classList.toggle("favoritado", salvo);
        favorito.setAttribute("aria-label", salvo ? "Remover dos favoritos" : "Adicionar aos favoritos");
        favorito.addEventListener("click", function () { alternarFavorito(item); });

        cartao.appendChild(abrir);
        cartao.appendChild(corpo);
        cartao.appendChild(favorito);
        fragmento.appendChild(cartao);
    }

    local.replaceChildren(fragmento);
}

function carregarFavoritos() {
    try {
        let texto = localStorage.getItem(CHAVE_FAVORITOS);
        if (!texto) return [];
        let lista = JSON.parse(texto);
        if (!Array.isArray(lista)) return [];
        return lista.filter(function (item) {
            return item && typeof item.id === "string" && item.id;
        });
    } catch (erro) {
        return [];
    }
}

function salvarFavoritos(lista) {
    try {
        localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(lista));
    } catch (erro) {
        avisar("Não foi possível salvar no navegador.");
    }
}

function alternarFavorito(item) {
    let posicao = estado.favoritos.findIndex(function (guardado) { return guardado.id === item.id; });
    if (posicao >= 0) {
        estado.favoritos.splice(posicao, 1);
    } else {
        estado.favoritos.unshift({
            id: item.id,
            titulo: item.titulo,
            descricao: item.descricao,
            data: item.data,
            tipo: item.tipo,
            miniatura: item.miniatura,
            ficha: item.ficha,
            anotacao: ""
        });
    }
    salvarFavoritos(estado.favoritos);
    mostrarTudo();
}

function editarAnotacao(item) {
    let texto = window.prompt("Anotação sobre este registro:", item.anotacao || "");
    if (texto === null) return;
    item.anotacao = texto.trim().slice(0, 200);
    salvarFavoritos(estado.favoritos);
    mostrarTudo();
}

function mostrarAlbum() {
    let local = document.getElementById("grade-album");
    let contador = document.getElementById("contador-album");
    if (contador) contador.textContent = String(estado.favoritos.length);
    if (!local) return;

    if (!estado.favoritos.length) {
        let vazio = document.createElement("p");
        vazio.className = "vazio";
        vazio.textContent = "O álbum está vazio. Use o coração nos resultados para guardar um registro.";
        local.replaceChildren(vazio);
        return;
    }
    mostrarCartoes(estado.favoritos, local, "album");
}

function mostrarTudo() {
    mostrarCartoes(estado.itens, document.getElementById("resultados"));
    mostrarAlbum();
}

function enderecoVideo(urls) {
    let arquivos = urls.filter(function (url) {
        return typeof url === "string" && /\.mp4($|\?)/i.test(url);
    });
    if (!arquivos.length) return null;
    let escolhido = arquivos.find(function (url) { return /~medium\.mp4/i.test(url); })
        || arquivos.find(function (url) { return /~mobile\.mp4/i.test(url); })
        || arquivos[0];
    return escolhido.replace(/^http:/, "https:");
}

async function abrirDetalhe(item) {
    let janela = document.getElementById("detalhe");
    if (!janela) return;

    document.getElementById("titulo-detalhe").textContent = item.titulo;
    document.getElementById("descricao-detalhe").textContent = item.descricao || "Sem descrição disponível.";
    document.getElementById("link-detalhe").href = "https://images.nasa.gov/details/" + encodeURIComponent(item.id);

    let midia = document.getElementById("midia-detalhe");
    midia.replaceChildren();
    if (item.miniatura) {
        let imagem = document.createElement("img");
        imagem.src = item.miniatura;
        imagem.alt = item.titulo;
        midia.appendChild(imagem);
    } else {
        midia.appendChild(avisoImagem("Sem miniatura"));
    }

    janela.showModal();

    if (item.tipo !== "video" || !item.ficha) return;
    try {
        let resposta = await fetch(item.ficha);
        if (!resposta.ok) throw new Error("Erro HTTP: " + resposta.status);
        let urls = await resposta.json();
        let video = enderecoVideo(Array.isArray(urls) ? urls : []);
        if (video) {
            let reprodutor = document.createElement("video");
            reprodutor.controls = true;
            reprodutor.poster = item.miniatura || "";
            reprodutor.src = video;
            midia.replaceChildren(reprodutor);
        }
    } catch (erro) {
        avisar("O vídeo não carregou; a ficha da NASA continua disponível.");
    }
}

function iniciar() {
    estado.favoritos = carregarFavoritos();
    mostrarTudo();

    let formulario = document.getElementById("formulario-busca");
    let campo = document.getElementById("campo-busca");
    let tipo = document.getElementById("tipo-midia");
    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        estado.termo = campo.value.trim();
        estado.tipo = tipo.value;
        estado.itens = [];
        estado.pagina = 1;
        buscar(1, true);
    });

    let botaoMais = document.getElementById("carregar-mais");
    botaoMais.addEventListener("click", function () { buscar(estado.pagina + 1, false); });

    let explorar = document.getElementById("explorar");
    let album = document.getElementById("album");
    let abaExplorar = document.getElementById("aba-explorar");
    let abaAlbum = document.getElementById("aba-album");

    function mostrarSecao(secao) {
        let ehAlbum = secao === "album";
        explorar.hidden = ehAlbum;
        album.hidden = !ehAlbum;
        abaExplorar.classList.toggle("ativa", !ehAlbum);
        abaAlbum.classList.toggle("ativa", ehAlbum);
        abaExplorar.setAttribute("aria-selected", String(!ehAlbum));
        abaAlbum.setAttribute("aria-selected", String(ehAlbum));
    }

    abaExplorar.addEventListener("click", function () { mostrarSecao("explorar"); });
    abaAlbum.addEventListener("click", function () { mostrarSecao("album"); });

    document.getElementById("limpar-album").addEventListener("click", function () {
        if (!estado.favoritos.length) return;
        if (!window.confirm("Remover todos os registros do álbum?")) return;
        estado.favoritos = [];
        salvarFavoritos([]);
        mostrarTudo();
    });

    let janela = document.getElementById("detalhe");
    document.getElementById("fechar-detalhe").addEventListener("click", function () { janela.close(); });
    janela.addEventListener("click", function (evento) {
        if (evento.target === janela) janela.close();
    });

    buscar(1, true);
}

document.addEventListener("DOMContentLoaded", iniciar);
