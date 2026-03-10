/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
console.log("Starting application...");
import { render } from 'preact';
import { useState, useCallback, useEffect } from 'preact/hooks';
import { GoogleGenAI, GenerateContentResponse as GeminiGenerateContentResponse, FinishReason } from "@google/genai";
import { h, JSX as PreactJSX } from 'preact';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageOrientation } from 'docx';
import mammoth from 'mammoth';
import JSZip from 'jszip';


interface HistoryItem {
    id: string;
    date: string;
    type: string;
    content: string;
    title: string;
}

const MAX_LOCAL_STORAGE_SIZE = 4 * 1024 * 1024; // Approx 4MB for safety
const LOCAL_STORAGE_TRAINING_FILES_KEY = 'geminiAppTrainingFiles';
const LOCAL_STORAGE_HISTORY_KEY = 'geminiAppHistory';

interface TrainingFile {
    name: string;
    type: string;
    base64Data: string;
    size: number;
}

interface ReportOptionsState {
    relatorioFinalJuiz: boolean;
    despachoAPF: boolean;
    relatorioInvestigacaoDelegado: boolean;
    relatorioInvestigacaoPAI: boolean;
    relatorioProcedimentoAdministrativo: boolean;
    pedidoQuebraSigilo: boolean;
    pedidoMBA: boolean;
    pedidoPrisaoPreventiva: boolean;
    pedidoPrisaoTemporaria: boolean;
    comIndiciamento: boolean;
    semIndiciamento: boolean;
    semAutoria: boolean;
}

function getDefaultTrainingData(): TrainingFile[] {
    const defaultDocs = [
        { name: "Modelo Padrão - Relatório Final Injúria.txt", text: `POLICIA\nCIVIL\nRS\nESTADO DO RIO GRANDE DO SUL\nSECRETARIA DA SEGURANÇA PÚBLICA\nPOLÍCIA CIVIL\nDELEGACIA DE POLÍCIA DE MOSTARDAS\nRELATÓRIO FINAL\nInquérito Policial: 42/2023/152511/A\nSenhor Juiz,\nO Delegado de Polícia, que ao final subscreve, vem à presença de Vossa\nExcelência apresentar relatório final nos termos do art. 10, §1°, CPP c/c o art. 98 e\nseguintes da Portaria nº 164/2007/GAB/CH/PC.\nTrata-se de Inquérito Policial instaurado para apurar a prática do crime\nde injúria no contexto de violência doméstica e familiar praticado, em tese, por VI-\nTOr MATEUS DE MATOS AMARAL, no dia 08/01/2023, às 02h20min, na loca-\nlidade da Praia da Solidão, Estrada do Farol da Solidão, núm. 24, Mostardas/RS.\nTendo chegado ao conhecimento da autoridade policial a notícia, em te-\nse, do delitos de INJURIA – Consumado, ocorrido no dia 08/01/2023 às 02:20, ten-\ndo como Vítima – VERA REGINA GARCÊZ RIBEIRO; Suspeito – VITOR MA-\nTEUS DE MATOS AMARAL, conforme boletim de ocorrência 400010/2023/7207,\nINSTAURADO INQUÉRITO POLICIAL para apuração do fato e determinado as\ndiligências para elucidação do ocorrido.\nPor ocasião o fato narrado no histórico da ocorrência:\nLocal: Bar e Lancheria do Diego\nA vítima informa que o vínculo com o agressor é Ex marido. Que o agressor faz uso\nde drogas. Que ela tem 1 filho(s) de outro relacionamento. Que tem filho(s) com\nmais de 18 anos. Vítima deseja ser notificada por Whatsapp. Melhor turno para con-\ntato é: Manhã. Estava no banheiro o agressor me chamou de vagabunda em segui-\nda estava dançando e o mesmo me chamou de puta e vagabunda depois fora do\nlocal fez gestos obscenos dizendo pra chupar que é de uva. Advertida sobre o pra-\nzo decadencial de seis meses, a vítima Vera Regina Garcêz Ribeiro deseja repre-\nsentar/prestar queixa, caso o fato narrado necessite dessa condição, contra o autor.\nRua Júlio de Castilhos, 1031 - Mostardas/RS - CEP 96270-000\nFone (51) 3673-1054 - e-mail: mostardas-dp@pc.rs.gov.br\n\nPor ocasião do interrogatório policial, o investigado VITOR MATEUS\nDE MATOS AMARAL negou ter proferido ameaças contra a vítima.\nO declarante nega os fatos registrados na ocorrência policial nº 7207/2023/400010. O de-\nclarante afirma que não realizou nenhuma das injúrias, gestos obscenos ou ameaças regis-\ntradas nesta ocorrência policial. O declarante afirma que já moraram juntos anteriormente\ne que durante a relação batiam boca e discutiam, mas depois que se separaram isso não\nmais aconteceu. Perguntado se é usuário de drogas; Responde que não. Informa que já\nusou no passado. Perguntado qual tipo de droga já usou; Responde que já usou cocaína em\n2009. Perguntado se tem algum tipo de contato com a vítima; Responde que não. Informa\nque a vítima ligou para ele, mas ele não mais a atendeu.\nConforme preconiza a Lei nº 12.830/13, o indiciamento é ato privativo\ndo Delegado de Polícia, devendo ocorrer por ato fundamentado, mediante análise\ntécnico-jurídica do fato, indicando a autoria, a materialidade e suas circunstâncias.\nA INJÚRIA está prevista na lei 11.340 - Maria da Penha como uma das\nformas de violência doméstica e familiar contra a mulher - "Inciso V a violência\nmoral, entendida como qualquer conduta que configure calúnia, difamação ou\ninjúria".\nCabe salientar que se tratando de fatos ocorridos no âmbito familiar, a\npalavra da ofendida assume especial relevância probatória e, se coerente, basta para\nensejar o indiciamento, que conforme informação relatada no histórico pela\nofendida, ela é ex. Companheira de VITOR MATEUS DE MATOS AMARAL.\nRua Júlio de Castilhos, 1031 - Mostardas/RS - CEP 96270-000\nFone (51) 3673-1054 - e-mail: mostardas-dp@pc.rs.gov.br\n\nDesta forma, com fundamento no art. 2º, §6º, da Lei nº 12.830/2013,\nindicio VITOR MATEUS DE MATOS AMARAL pela prática do crime descrito\nno art. 7, inciso V da lei 11.340.\nÉ o relatório.\nMostardas/RS, 11 de junho de 2025.\nANDRÉ LUÍS CABRAL CASTILHO\nDelegado de Polícia\nRua Júlio de Castilhos, 1031 - Mostardas/RS - CEP 96270-000\nFone (51) 3673-1054 - e-mail: mostardas-dp@pc.rs.gov.br` },
        { name: "Modelo Padrão - Relatório SAD Tráfico.txt", text: `✓ POLICIAR\nS CIVIL\nRS\nESTADO DO RIO GRANDE DO SUL\nPOLÍCIA CIVIL\nDELEGACIA DE POLÍCIA REGIONAL DE IJUÍ - 26ª DPRI\nRELATÓRIO SAD 06/2025/152800/26*DPR\nDa Instrução\nA presente sindicância preliminar foi instaurada pela Portaria nº 06/2025/152800 do\nSAE/26ªDPRI para apurar os fatos denunciados em Termo de Audiência de Custódia datada\nde 15/05/2025, proveniente do plantão TJRS, referente ao processo nº 5006877-\n84.2025.8.21.0016/RS (APF 4904/2025/152808), onde consta a manifestação do flagrado\nIGOR PATRICK E LIMA MARIANO acerca da forma como teria ocorrido sua prisão em\nflagrante pelo crime de Tráfico de Drogas.\nConforme consta na Portaria de instauração, o flagrado IGOR PATRICK E LIMA\nMARIANO, ao ser inquirido pelo Magistrado na referida audiência, alegou que Policiais\nCivis da DRACO teriam danificado o portão de acesso da sua casa e pulado a cerca do\nimóvel, entrando na residência sem mandado de busca. Alegou, ainda, que não teria sido\nagredido fisicamente, mas que os policiais teriam sido "bem arrogantes" com ele,\nconfigurando, em sua visão, um tipo de abuso de autoridade.\nO expediente que originou a presente sindicância preliminar encontra-se registrado\nsob o PROA n° 25/1204-0012597-5, de Fiscalização dos Processos Administrativos.\nInicialmente, foram juntados aos autos a cópia do Termo de Audiência de Custódia\ndatada de 15/05/2025 e respectiva mídia, cópia do Auto de Prisão em Flagrante nº\n4904/2025/152808, cópia do despacho de homologação do APF e cópia do exame de corpo\nde delito do conduzido. Foi, ainda, juntada a comunicação de instauração do procedimento\nadministrativo ao Departamento de Polícia do Interior (DPI) e à Corregedoria Geral de\nPolícia (COGEPOL).\nPara esclarecimento dos fatos e apuração de eventual irregularidade funcional, foram\nrealizadas as oitivas dos Agentes Policiais que participaram da diligência e da prisão em\nflagrante do nacional IGOR PATRICK E LIMA MARIANO.\nDos Depoimentos\nO Comissário de Polícia MÁRCIO DILL, lotado na DRACO de Ijuí, relatou que\ntrabalhou na investigação e operação na Rua Bento Carvalho, 388, após denúncias\nanônimas de tráfico. Sua equipe monitorou o local e presenciou IGOR entregando uma\nbucha de cocaína a um indivíduo em um veículo. Este veículo foi abordado e o indivíduo\n(motorista) confirmou ter comprado a droga ali, fato registrado em BO. Diante do crime\npermanente de tráfico, a equipe foi até a residência e pediu para Igor abrir o portão, mas ele\n26ªDPRI - Serviço de Assessoramento Especial (SAE)\nÓrgão 152805 - Telefone: 55 3331 9750 Av. Coronel Dico, 759 - Bairro Assis Brasil - Ijuí/RS - CEP 98700-000\n\ndemorou e fez menção de correr para os fundos. Para prevenir ocultação/destruição de\nprovas, a equipe levantou o portão para ingressar rapidamente, sem danificá-lo. Drogas e\ndinheiro foram encontrados. Sobre a alegação de Igor de drogas em locais diversos e\nsomente ele flagrado, esclarece que a decisão sobre quem é autuado é da Autoridade\nPolicial, possivelmente baseada na entrega da droga presenciada. Reforça que o portão não\nfoi danificado, apenas erguido devido à demora de Igor e ao risco de ocultação de provas,\nconsiderando a presença de outras pessoas. Negou qualquer atitude arrogante ou agressão\nfisica/verbal por parte dos policiais, afirmando que todos agiram profissionalmente e os\nprocedimentos seguiram os trâmites legais e a homologação judicial do APF.\nO Escrivão de Polícia EDUARDO MANZONI RUFINO, lotado na DRACO de\nIjuí, declarou ter participado da operação de vigilância no local denunciado como ponto de\ntráfico (Rua Bento Carvalho, 388). Confirmou que, durante o monitoramento, a equipe\npresenciou IGOR entregando uma bucha de cocaína a uma pessoa em um veículo, o qual foi\nabordado posteriormente, sendo confirmada a compra da droga no local (BO\n166/2025/152803). Em face do crime permanente, dirigiram-se à residência, solicitaram a\nabertura do portão, mas Igor demorou a atender e fez um movimento para ir aos fundos da\ncasa. Devido ao risco de ocultação ou destruição de provas, decidiram levantar o portão\npara ingressar rapidamente, sem causar dano à estrutura. Dentro da residência, encontraram\ndrogas e dinheiro. Esclareceu que a decisão sobre quem é autuado em flagrante é\nprerrogativa da Autoridade Policial, e no caso de Igor, baseada na venda da droga\npresenciada. Reafirmou que não houve dano ao portão, apenas foi erguido, justificando a\nação pela demora de Igor em abrir e pela intenção de ir aos fundos, temendo a destruição de\nprovas, especialmente com outras pessoas no imóvel. Negou qualquer atitude arrogante ou\nagressão por parte dos policiais, ressaltando que a conduta de todos foi estritamente\nprofissional, seguindo a legalidade, com o APF devidamente homologado.\nO Inspetor de Polícia CÁSSIO PATRICK ALVARISTO, lotado na DRACO de\nIjuí, também participou da operação na Rua Bento Carvalho, 388, após denúncias de tráfico.\nConfirmou ter visualizado IGOR entregando droga a um ocupante de veículo, que foi\nabordado e confirmou a compra (BO 166/2025/152803). Diante da confirmação da venda e\ndo crime permanente, dirigiu-se à residência. Relatou que solicitaram a Igor que abrisse o\nportão, mas ele demorou e fez menção de ir para os fundos. A equipe decidiu abrir o portão\npara entrar rapidamente, sem causar dano, embora o portão tenha sido "deslocado", foi\napenas "erguido". Dentro da residência, encontraram drogas e dinheiro. Quanto à alegação\nde Igor de que a droga foi encontrada em outros locais e apenas ele autuado, salientou que a\ndecisão é da Autoridade Policial, provavelmente baseada na entrega da droga presenciada.\nReafirmou que não houve dano ao portão, apenas foi erguido/deslocado para permitir\ningresso imediato devido à demora de Igor e sua tentativa de evasão para os fundos,\ntemendo ocultação de provas com outras pessoas presentes. Frisou que a conduta de todos\nos policiais foi estritamente profissional, e uma abordagem verbal com firmeza, própria da\ndidática policial, não deve ser confundida com arrogância. Negou qualquer agressão física\n\nou verbal. Os procedimentos seguiram a legalidade, e o APF foi homologado pelo Juiz\nPlantonista.\nO exame de corpo de delito realizado em IGOR PATRICK E LIMA MARIANO na\ndata de 14/05/2025, antes da audiência de custódia, constatou "Sem lesões aparentes" e o\npericiado "Nega qualquer queixa".\nO despacho de homologação do Auto de Prisão em Flagrante (APF\n4904/2025/152808) descreve a operação, o monitoramento, a entrega de droga presenciada,\na abordagem do usuário (Alberi da Silva Siqueira), a entrada na residência (crime\npermanente) onde foram encontradas drogas (em um dos quartos) e dinheiro. Também\nforam encontradas drogas em veículo estacionado em frente. O flagrado permaneceu silente\nna fase policial. O despacho judiciário homologou o flagrante e decretou a prisão\npreventiva, justificando a entrada na residência em razão do crime permanente.\nDa Conclusão\nDe tudo o que foi trazido à presente sindicância preliminar para apuração de\neventual irregularidade funcional por parte dos Policiais Civis que efetuaram a prisão em\nflagrante de IGOR PATRICK E LIMA MARIANO, não restou evidenciada qualquer\ntransgressão de ordem disciplinar que encontre substância nas alegações apresentadas pelo\ndenunciante em Audiência de Custódia.\nAs alegações de dano ao portão e entrada ilegal sem mandado não se sustentam\ndiante dos depoimentos unânimes dos policiais envolvidos, que relataram ter apenas\nerguido/deslocado o portão sem danificá-lo, visando garantir a rapidez e eficácia da ação\npolicial para impedir a ocultação ou destruição de provas, especialmente considerando a\ndemora de Igor em atender à solicitação de abertura, seu movimento indicando intenção de\nir aos fundos do imóvel e a presença de outras pessoas no local. A entrada na residência\nmostrou-se justificada pelo flagrante delito de tráfico de drogas, que, sendo crime de\nnatureza permanente, dispensa mandado judicial para o ingresso no domicílio, conforme\nprevisto em lei e reconhecido pela decisão judicial que homologou o APF.\nNo que concerne à alegação de arrogância ou abuso de autoridade, os policiais\nnegaram veementemente tais condutas, afirmando terem agido com profissionalismo e\ndentro dos limites legais e da didática policial, que por vezes exige firmeza. A ausência de\nlesões aparentes em Igor, conforme atestado no exame de corpo de delito realizado logo\napós sua prisão, e sua própria negativa de queixas físicas na ocasião, contrapõe-se a\nqualquer alegação de agressão física. A subjetividade da percepção de "arrogância" por\nparte do conduzido não encontra respaldo nos relatos objetivos dos policiais, que descrevem\numa ação profissional justificada pelas circunstâncias da operação de combate ao tráfico.\nAdemais, a decisão sobre quem é autuado em flagrante e a valoração das provas\ncoletadas é prerrogativa da Autoridade Policial que presidiu o APF, e a droga foi encontrada\n\ntanto no interior da residência quanto em veículo no pátio, não apenas no local alegado pelo\nconduzido. O APF foi devidamente homologado pelo Poder Judiciário.\nAssim, face à total falta de elementos que corroborem as alegações do denunciante\nIGOR PATRICK E LIMA MARIANO e à inexistência de indícios de qualquer conduta\nirregular, transgressão disciplinar ou que afronte os deveres dos servidores policiais por\nocasião dos fatos, concluo esta sindicância preliminar.\nDiante do exposto, proponho o arquivamento do presente expediente com base no\nProvimento nº 01/2016/COGEPOL/PC, artigo 24.\nRemetam-se os presentes autos de sindicância preliminar ao DPI (Departamento de\nPolícia do Interior) para a devida apreciação hierárquica.\nIjuí, 20 de junio de 2025.\nRicardo/Blum Miron\nDelegado de Polícia\nAutoridade Sindicante ID 2430339\nRicardo Blum Miron\nDelegado de Polícia\nMatrícula 2430339` },
        { name: "Modelo Padrão - Relatório SAD Agressão.txt", text: `ESTADO DO RIO GRANDE DO SUL\nPOLÍCIA CIVIL\n26ª DELEGACIA DE POLÍCIA REGIONAL DE IJUI\nRELATÓRIO SAD 02/2024/152800/26ªDPR\nDa Instrução\nA presente sindicância preliminar foi instaurada\npela Portaria nº 02/2024/152800 para apurar os fatos denunciados mediante o\nrecebimento do Proa 24/1204-0003322-6 que se refere a Termo de Audiência\nde Custódia datada de 26/02/2024, proveniente da 2ª Vara Criminal da\nComarca de ljuí, processo nº 5002152-86.2024.8.21.0016, onde consta a\nfundamentação da decisão da magistrada Dra Maria Luiza Pollo Gaspary, nos\nseguintes termos: "Outrossim. Oficie-se a Corregedoria da Polícia Civil para\nque tome as providências que entender cabíveis, diante do relato do flagrado".\nA determinação acima descrita se encontra\nembasada no expediente contendo o depoimento do preso DEIVID MATHEUS\nPEREIRA DA SILVA, obtido por meio da gravação da Audiência de Custódia, o\nqual alegou ter sofrido agressão por parte dos Policiais Civis que o prenderam\nem sua residência na data de 24/02/2024.\nDEIVID MATHEUS PEREIRA DA SILVA fora\npreso e autuado em flagrante delito de Tráfico de drogas por Policiais Civis da\nDRACO de ljuí, nos termos do registro de ocorrência policial nº\n1702/2024/152808, nesta cidade de ljuí.\nAnexada cópia do mandado de busca e\napreensão judicial efetivado na residência de DEIVID MATHEUS PEREIRA DA\n\nSILVA e Relatório Circunstanciado de Cumprimento de Mandado de Busca e\nApreensão, que descreveu todos os itens apreendidos, como drogas ilícitas,\nbalanças de precisão, veículo e aparelhos celulares, bem como as\ncircunstâncias da realização da diligência.\nJuntada cópia integral do inquérito policial nº\n27/2024/152803 referente a investigação de crime de Tráfico de drogas por\nparte da DRACO/ljui, tendo como indiciado DEIVID MATHEUS PEREIRA DA\nSILVA, o qual, quando foi ouvido por ocasião da sua autuação em flagrante\ndelito, na presença de seu Defensor Constituído, Dr Celso Rodrigues Junior,\nnão se manifestou sobre os fatos que ensejaram sua prisão e também nada\nreferiu sobre agressões sofridas decorrentes da ação policial.\nConsta, inclusive, nos autos do referido\ninquérito policial 27/2024/152803 uma cópia de exame de corpo de delito em\nnome de DEIVID MATHEUS PEREIRA DA SILVA datada de 24/02/2024,\nhorário das 18:38:02, realizado pela UPA de ljuí em que não foram constatadas\nlesões aparentes no autuado e nem houve registro de queixa do paciente.\nPara esclarecimento dos fatos e apuração de\neventual irregularidade funcional não bem delineada foi ouvida a gravação do\ndepoimento de DEIVID MATHEUS PEREIRA DA SILVA, efetivado na\nAudiência de Custódia, e foram tomados a termo os depoimentos dos Agentes\nPolicias CARLA TATIANE CECHETTO, MARCIO DILL e EDUARDO MAZONI\nRUFINO, os quais participaram das diligências de cumprimento do mandado de\nbusca e apreensão na residência de DEIVID.\nNo depoimento de DEIVID MATHEUS\nPEREIRA DA SILVA prestado por ocasião da realização da Audiência de\nCustódia efetivado no dia 26/02/2024 pelo Tribunal de Justiça do RS, o mesmo\n\nreferiu que, no dia dos fatos, Policiais Civis entraram em sua residência e o\nagrediram com coices e tapas e depois o prenderam, algemando-o. Disse que\nprimeiramente não referiram o motivo da sua prisão, apenas que estavam\ninvestigando, e que teriam danificado o imóvel quando entraram. Informou que\nos Policiais teriam tentado desbloquear o seu celular e queriam que colocasse\no seu polegar no aparelho para desbloquear, mas que não colocara e os\nPoliciais não conseguiram desbloquear. Salientou que fora encaminhado para\nexame de lesões corporais e que, primeiramente, não tinha nada mas depois\ncomeçara a lhe doer o lado direito do peito e o braço, motivo pelo qual foi\nlevado novamente a exame médico.\nFoi anexada a cópia de um segundo exame de\ncorpo de delito realizado em DEIVID MATHEUS PEREIRA DA SILVA no dia\n24/02/2024, horário das 22:28:29, momentos antes do mesmo ser conduzido a\nPenitenciária Modulada de ljuí, conforme documento encaminhado pela\nSUSEPE, que evidenciou "hiperemia em hipocondrio direito, dor a palpação\nsuperficial no local da lesão, abdome indolor a palpação profunda, ssip".\nA testemunha CARLA TATIANE CECHETTO,\nInspetora de Polícia, prestou depoimento e declarou que no momento da\nentrada na residência de DEIVID ele estava na sala/cozinha embalando drogas\nna mesa e correra para um canto da parede. Disse que deram voz de prisão a\nele quando viram as drogas, porém ele resistira a prisão e não aceitara a\nabordagem, não querendo ser algemado. Referiu que DEIVID se virava de\ncosta e não queria colocar as mãos para trás, sendo que tentava agredir os\nPoliciais. Percebera que durante a ação DEIVID batera com o peito na mesa da\ncozinha, porém não fora possível visualizar lesão alguma, conforme atestou o\nlaudo de corpo de delito. Em relação a tentativa dos Policiais de desbloquear o\naparelho celular dele referiu não ser verdade tal alegação. Disse que mais uma\n\nvez a equipe da DRACO vem sendo vítima de falsas acusações de clientes do\nAdvogado Celso Rodrigues Junior, Advogado da facção Os Manos.\nA testemunha MARCIO DILL, Comissário de\nPolícia, prestou depoimento e declarou que fora cumprido mandado de busca e\napreensão na casa de DEIVID MATHEUS PEREIRA DA SILVA, sendo que\nquando entraram no interior do imóvel, DEIVID estava embalando drogas sobre\na mesa e correra para o canto da parede. Disse que de imediato deram voz de\nprisão para DEIVID que resistiu a prisão e não quis ser algemado, recusando-\nse a virar de costas e a colocar as pernas para trás. O acusado ainda tentara\nagredir os Policiais com as pernas. Disse que não houve nenhuma agressão\ncontra DEIVID, somente o necessário para algemá-lo, e que ele batera o peito\nna mesa da cozinha, porém não ficara lesão alguma aparente, conforme o\nlaudo médico. Salienta que não houve tentativa de desbloqueio do aparelho\ncelular de DEIVID com a digital dele, sendo que o aparelho foi apreendido.\nReferiu que novamente a equipe da DRACO vem sendo alvo de uma\ncampanha difamatória por Advogado da facção criminosa, visando\ndesqualificar o trabalho policial.\nA testemunha EDUARDO MANZONI RUFINO,\nEscrivão de Policia, prestou depoimento e declarou que cumprira mandado de\nbusca e apreensão na residência de DEIVID MATHEUS PEREIRA DA SILVA,\nsendo que no interior do imóvel encontraram DEIVID embalando a droga em\ncima da mesa e, no momento em que vira os Policiais, o mesmo correra para a\nparede. Disse que deram voz de prisão a ele, porém o mesmo não aceitara a\nalgemação e recusara a virar de costa e colocar as mãos para trás. Referiu que\nele ainda tentara chutar os Policiais. Disse que não hou agressão dos Policiais\na DEIVID, mas somente a imobilização para algemá-lo, sendo que também não\nhouve tentativa de desbloqueio forçado do aparelho celular dele. Salientou\nacreditar que tais alegações de DEIVID sejam orientações do Advogado Celso\n\nRodrigues Junior, eis que existe recorrência de acusações contra os Policiais\nCivis da DRACO por integrantes da facção Os Manos.\nDa Conclusão\nDe tudo o que foi trazido à presente sindicância\npreliminar para apuração de eventual irregularidade funcional, não restou\nevidenciada conduta que configure ilegalidade ou qualquer transgressão\ndisciplinar por parte dos Policiais Civis que efetuaram o cumprimento da\ndiligência de mandado de busca e apreensão na residência de DEIVID\nMATHEUS PEREIRA DA SILVA, e que acabou resultando na sua prisão em\nflagrante delito por crime de Tráfico de Drogas.\nPrimeiramente é necessário pontuar que os\nAgentes Policiais foram destacados pela Autoridade Policial para cumprimento\ndo mandado expedido judicialmente que visava a busca por substâncias\nentorpecentes na residência do investigado DEIVID pois a investigação\nanterior, embasada em procedimento policial, já evidenciava o envolvimento do\nmesmo na comercialização de drogas e na associação criminosa para tai fim.\nAs queixas relacionadas ao dano patrimonial\nno imóvel residencial e a suposta agressão sofrida pelo preso DEIVID na\nAudiência de Custódia foram relatadas após a assistência do Advogado,\ninclusive com sua intervenção na Audiência. Tal Advogado efetivamente presta\nserviços advocatícios para a facção criminosa denominada "Os Manos", sendo\ntal fato do conhecimento policial e geral nesta comunidade.\nAcrescente-se que, em relação ao dano\npatrimonial na residência do investigado, o artigo 245 do Código de Processo\nPenal, nos seus parágrafos 2º e 3º, esclarece que:\n\n§2º-"Em caso de desobediência, será arrombada a porta\ne forçada a entrada."\n§3°-"Recalcitrando o morador, será permitido o emprego\nde força contra coisas existentes no interior da casa,\npara o descobrimento do que se procura."\nAssim, qualquer dano no imóvel que possa ter\nocorrido por ocasião do cumprimento da diligência, a sua reparação pode ser\nbuscada pelo proprietário com a competente ação judicial na Justiça Civil.\nEm relação a suposta agressão sofrida por\nDEIVID MATHEUS PEREIRA DA SILVA em decorrência da sua prisão pelos\nPolicias Civis, não restou qualquer evidencia de que tenha de fato acontecido,\neis que o investigado, quando fora surpreendido com as drogas sendo\nembaladas em cima da mesa de sua casa, tentara fugir do local e resistira à\nabordagem dos Policiais, investindo contra os mesmos com chutes, até o\nmomento em que fora dominado e finalmente algemado. Dessa forma, é\nnatural que durante essa resistência do preso e a tentativa dos Policiais de\ndominá-lo, ocorram quedas ou batidas que na hora não são sentidas, mas que\ndepois, quando os ânimos se encontram mais calmos, as dores apareçam\nassim como as marcas das lesões.\nNo\ncaso\nespecífico do preso DEIVID\nMATHEUS PEREIRA DA SILVA, após a sua desobediência à ordem legal e\nresistência, o mesmo foi dominado e preso, sendo conduzido para o devido\nexame de corpo de delito que nada constatou de anormalidade e nem o\nautuado ofereceu queixa no momento de alguma dor ou desconforto. Porém,\npassado alguns momentos, DEIVID passou a sentir dores no peito e foi\nnovamente levado a exame de corpo de delito, que constatou uma hiperemia e\nsensibilidade a "palpação" na altura do peito, que decorreu, provavelmente, da\nsua ação de resistir à prisão e da necessidade de sua imobilização.\n\nAssim, não vislumbro qualquer conduta que\nconstitua transgressão disciplinar ou que afronte os deveres comuns aos\nservidores públicos em geral ou os deveres atinentes aos servidores da Polícia\nCivil por parte de qualquer Agente Policial, por ocasião desses fatos.\nDiante do exposto, face à inexistência de\nqualquer infração ou irregularidade disciplinar de qualquer ordem, concluo esta\nsindicância preliminar e proponho o arquivamento do presente expediente com\nbase no Provimento nº 01/2016/COGEPOL/PC, artigo 24.\nRemetam-se os presentes autos de sindicância\npreliminar ao DPI (Departamento de Polícia do Interior) para a devida\napreciação hierárquica.\nEm 08 de agosto de 2024.\nRicardo Blum Miron\nAutoridade Sindicante\nRicardo Blum Miron\nDelegado de Polícia\nMatrícula 2430339` },
        { name: "Modelo Padrão - Relatório Final Lesão Corporal.txt", text: `POLICIA\nCIVIL\nRS\nESTADO DO RIO GRANDE DO SUL\nSECRETARIA DA SEGURANÇA PÚBLICA\nPOLÍCIA CIVIL\nDELEGACIA DE POLÍCIA DE MOSTARDAS\nRELATÓRIO FINAL\nInquérito Policial: 102/2023/152511/A\nSenhor Juiz,\nO Delegado de Polícia, que ao final subscreve, vem à presença de Vossa\nExcelência apresentar relatório final nos termos do art. 10, §1°, CPP c/c o art. 98 e\nseguintes da Portaria nº 164/2007/GAB/CH/PC.\nTrata-se de Inquérito Policial instaurado para apurar crime de lesão cor-\nporal no contexto de violência doméstica e familiar praticado, em tese, por NEURI\nVILANOVA LIBANO no dia 01/04/2023, por volta das 15h50min, na Rua Juvenal\nGonçalves Braga, 178, Mostardas/RS, e tendo como suposta vítima CARINE DE\nOLIVEIRA FERREIRA.\nNo dia 03/04/2023, CARINE DE OLIVEIRA FERREIRA compareceu\nnesta delegacia para comunicar que no dia 01/04/2023, NEURI invadiu sua residên-\ncia e lhe desferiu três tapas no rosto e na cabeça, restando lesionada. Conforme se-\ngue, no termo de informações da vítima: “Informa que seu ex-companheiro, ora\nsuspeito, invadiu sua propriedade na data de 01/04/2023, às 15h50min. Que o sus-\npeito desferiu três tapas, sendo dois em seu rosto e um na cabeça, restando lesões\npróximas ao nariz do lado esquerdo do rosto. Que não recorda do que o suspeito\nlhe disse no momento do fato, mas estava aparentemente alcoolizado. O suspeito é\nagressivo e apresenta ciúme possessivo, levando a vítima acreditar que seja este o\nmotivo da aproximação. O suspeito realizava acompanhamento com psiquiátra e\ntomava medicação controlada por ser bipolar, mas parou de tomar suas medica-\nções por conta própria, pois estava fazendo uso excessivo de álcool.(...)"\nAportou nos autos o laudo pericial nº 56526/2023 indicando que a inte-\ngridade corporal de CARINE DE OLIVEIRA FERREIRA restou ofendida, com ba-\nse em perícia indireta e ficha ambulatorial.\nPor ocasião do interrogatório policial, o investigado NEURI VILANO-\nVA LIBANO, cientificado de seus direitos e garantias constitucionais, entre os quais\no de permanecer em silêncio e de ser assistido por advogado, declarou que: “(...) não\nse recorda do dia dos fatos narrados na ocorrência. Disse que nunca agrediu fisica-\nmente a vítima, porém em algumas discussões já desferiu empurrões em CARINE.\nInforma, também, que no calor das discussões, já houve xingamnetos recíprocos.\nRua Júlio de Castilhos, 1031 - Mostardas/RS - CEP 96270-000\nFone (51) 3673-1054 - e-mail: mostardas-dp@pc.rs.gov.br\n\nRessalta que utiliza medicações para dormir e que toma bebidas alcoólicas somente\nem encontros com a família e amigos. Disse, o depoente, que se surpreende com o\nrelato\nvítima, pois jamais desferiu tapas no rosto de CARINE.”\nO delito de lesão corporal praticada contra a mulher está previsto no\nCódigo Penal no art. 129, § 13°, in verbis:\nArt. 129 - Ofender a integridade corporal ou a saúde de outrem:\n§ 13°- Se a lesão for praticada contra a mulher, por razões da condição do sexo\nfeminino, nos termos do § 2º-A do art. 121 deste Código:\nConforme preconiza a Lei nº 12.830/13, o indiciamento é ato privativo\ndo Delegado de Polícia, devendo ocorrer por ato fundamentado, mediante análise téc-\nnico-jurídica do fato, indicando a autoria, a materialidade e suas circunstâncias.\nNão há dúvidas de que os fatos ocorreram no contexto de violência\ndoméstica e familiar, na medida em que a vítima e o investigado conviveram numa\nrelação íntima de afeto (art. 5º, III, Lei 11340/06). Também, não há dúvida de que a\nconduta de ofender a integridade ou saúde corporal da vítima, visando controlar suas\nações e comportamentos representa forma de violência doméstica e familiar contra a\nmulher (art. 7º, I, Lei 11340/06).\nNo caso vertente, diante dos elementos informativos amealhados, enten-\ndo que NEURI VILANOVA LIBANO praticou o delito de lesões corporais (art.\n129, CP), no contexto de violência doméstica e familiar.\nCabe salientar que se tratando de fatos ocorridos no âmbito familiar, a\npalavra da ofendida assume especial relevância probatória e, se coerente, basta para\nensejar o indiciamento.\nDesta forma, com fundamento no art. 2º, §6º, da Lei nº 12.830/2013,\nINDICIO NEURI VILANOVA LIBANO pela prática do crime descrito no art.\n129, § 13º do Código Penal, na forma da Lei 11.340/2006.\nÉ o relatório.\nMostardas/RS, 28 de junho de 2023.\nRua Júlio de Castilhos, 1031 - Mostardas/RS - CEP 96270-000\nFone (51) 3673-1054 - e-mail: mostardas-dp@pc.rs.gov.br\n\nANDRÉ LUIS CABRAL CASTILHO\nDelegado de Polícia\nRua Júlio de Castilhos, 1031 - Mostardas/RS - CEP 96270-000\nFone (51) 3673-1054 - e-mail: mostardas-dp@pc.rs.gov.br` }
    ];

    return defaultDocs.map(doc => {
        const textContent = doc.text;
        const base64Data = btoa(unescape(encodeURIComponent(textContent)));
        const size = new Blob([textContent]).size;
        return {
            name: doc.name,
            type: 'text/plain',
            base64Data,
            size
        };
    });
}

const App = () => {
    // Main state
    const [activeTab, setActiveTab] = useState<'report' | 'training' | 'analyzer' | 'concatenator' | 'formalizer' | 'transcriber' | 'history'>('report');
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [theme, setTheme] = useState('light');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    
    // Report Generator state
    const [inqueritoFiles, setInqueritoFiles] = useState<File[]>([]);
    const [userConsiderations, setUserConsiderations] = useState('');
    const [generatedReport, setGeneratedReport] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
    const [reportOptions, setReportOptions] = useState<ReportOptionsState>({
        relatorioFinalJuiz: false,
        despachoAPF: false,
        relatorioInvestigacaoDelegado: false,
        relatorioInvestigacaoPAI: false,
        relatorioProcedimentoAdministrativo: false,
        pedidoQuebraSigilo: false,
        pedidoMBA: false,
        pedidoPrisaoPreventiva: false,
        pedidoPrisaoTemporaria: false,
        comIndiciamento: false,
        semIndiciamento: false,
        semAutoria: false,
    });
    const [indiciamentoDetails, setIndiciamentoDetails] = useState('');

    // Training state
    const [trainingFiles, setTrainingFiles] = useState<TrainingFile[]>([]);
    const [trainingFileWarning, setTrainingFileWarning] = useState('');
    const [localStorageError, setLocalStorageError] = useState('');
    const [trainingTextInput, setTrainingTextInput] = useState('');
    
    // Analyzer state
    const [analyzerFiles, setAnalyzerFiles] = useState<File[]>([]);
    const [analyzerSummary, setAnalyzerSummary] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzerError, setAnalyzerError] = useState('');
    const [analyzerConsiderations, setAnalyzerConsiderations] = useState('');
    
    // Concatenator state
    const [concatenatorMainFile, setConcatenatorMainFile] = useState<File | null>(null);
    const [concatenatorAdditionalFiles, setConcatenatorAdditionalFiles] = useState<File[]>([]);
    const [concatenatedReport, setConcatenatedReport] = useState('');
    const [isConcatenating, setIsConcatenating] = useState(false);
    const [concatenatorError, setConcatenatorError] = useState('');
    const [concatenatorConsiderations, setConcatenatorConsiderations] = useState('');

    // Formalizer state
    const [formalizerInputText, setFormalizerInputText] = useState('');
    const [formalizerMode, setFormalizerMode] = useState('depoimento');
    const [formalizerOutputText, setFormalizerOutputText] = useState('');
    const [isFormalizing, setIsFormalizing] = useState(false);
    const [formalizerError, setFormalizerError] = useState('');
    const [formalizerShowObservations, setFormalizerShowObservations] = useState(false);
    const [formalizerObservations, setFormalizerObservations] = useState('');

    // Transcriber state
    const [transcriberFiles, setTranscriberFiles] = useState<File[]>([]);
    const [transcriberConsiderations, setTranscriberConsiderations] = useState('');
    const [transcriberOptions, setTranscriberOptions] = useState({
        identifySpeaker: true,
        insertTimestamp: true,
    });
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcribedText, setTranscribedText] = useState('');
    const [transcriberError, setTranscriberError] = useState('');
    const [showNotice, setShowNotice] = useState(true);
    const [confirmClear, setConfirmClear] = useState(false);


    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const MASTER_PROMPT = `### Papel, Missão e Formato (Prioridade Máxima)
1.  **Persona:** Atue como um Delegado de Polícia com vasta experiência e profundo conhecimento jurídico e investigativo.
2.  **Contexto:** Você analisará relatórios de informação, investigações e outros documentos policiais que detalham diligências, provas e providências de um caso.
3.  **Missão Principal:** Sua tarefa é ler, compreender e consolidar todas as informações, atos e dados relevantes. A partir disso, você deve construir uma fundamentação fática coesa e aprofundada. O texto deve indicar, de forma resumida e interligada, as condutas dos investigados, as circunstâncias do fato, a materialidade delitiva e outros elementos pertinentes ao caso, sem jamais inventar informações. O objetivo é produzir um trabalho de excelência, com análise aprofundada.
4.  **Formato de Saída:** O resultado deve ser um texto em prosa, organizado em parágrafos bem estruturados. A linguagem deve ser clara, técnica, objetiva e formal, pronta para ser diretamente inserida em documentos oficiais como relatórios, despachos ou representações. **Evite estritamente o uso de listas com marcadores (bullet points) ou hifenização no final das linhas.** Use parágrafos contínuos para apresentar a análise.
5.  **Estrutura do Documento:** Você pode e deve usar formatação Markdown para organizar o documento com títulos e subtítulos (ex: \`# Título Principal\`, \`## Seção\`) e para dar ênfase com negrito (\`**texto importante**\`). Isso ajuda na clareza e na estrutura do documento final.
6.  **Confidencialidade:** Todos os dados são estritamente confidenciais e de uso exclusivo do solicitante. Não devem ser armazenados, reutilizados ou usados para treinamento de terceiros.

---
`;

    const acceptedUploadTypesForInput = [
        "application/pdf",
        "text/plain",
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.oasis.opendocument.text" 
    ];
    const acceptedMediaTypes = [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/x-m4a",
        "video/mp4", "video/webm", "video/mov", "video/quicktime", "video/x-matroska", "video/avi", "video/x-msvideo"
    ];
    const supportedMimeTypesForGeminiApi = ["application/pdf", "text/plain"];

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        setTheme(savedTheme);
    }, []);

    useEffect(() => {
        try {
            const storedFilesJSON = localStorage.getItem(LOCAL_STORAGE_TRAINING_FILES_KEY);
            if (storedFilesJSON) {
                const storedFiles = JSON.parse(storedFilesJSON);
                if (storedFiles.length > 0) {
                    setTrainingFiles(storedFiles);
                    return;
                }
            }
            setTrainingFiles(getDefaultTrainingData());
        } catch (e) {
            console.error("Error loading training files from localStorage:", e);
            setLocalStorageError("Erro ao carregar arquivos de treinamento salvos. Carregando modelos padrão.");
            setTrainingFiles(getDefaultTrainingData());
        }
    }, []); 


    useEffect(() => {
        try {
            const currentTotalSize = trainingFiles.reduce((acc, file) => acc + file.size, 0);
            if (currentTotalSize > MAX_LOCAL_STORAGE_SIZE) {
                setLocalStorageError(`Não foi possível salvar os arquivos de treinamento. Espaço de armazenamento local excedido (${(currentTotalSize / (1024*1024)).toFixed(2)}MB de ~4MB). Remova arquivos ou limpe o treinamento.`);
                return;
            }
            localStorage.setItem(LOCAL_STORAGE_TRAINING_FILES_KEY, JSON.stringify(trainingFiles));
            setLocalStorageError('');
        } catch (e) {
            console.error("Error saving training files to localStorage:", e);
            setLocalStorageError("Erro ao salvar arquivos de treinamento. O armazenamento local pode estar cheio ou indisponível.");
        }
    }, [trainingFiles]);

    useEffect(() => {
        if (!reportOptions.comIndiciamento) {
            setIndiciamentoDetails('');
        }
    }, [reportOptions.comIndiciamento]);

    useEffect(() => {
        try {
            const storedHistoryJSON = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
            if (storedHistoryJSON) {
                setHistory(JSON.parse(storedHistoryJSON));
            }
        } catch (e) {
            console.error("Error loading history from localStorage:", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error("Error saving history to localStorage:", e);
        }
    }, [history]);

    const addToHistory = useCallback((type: string, content: string, title: string) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            date: new Date().toLocaleString('pt-BR'),
            type,
            content,
            title: title || 'Sem título'
        };
        setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50 items
    }, []);

    const removeFromHistory = useCallback((id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    }, []);

    const clearHistory = useCallback(() => {
        if (confirmClear) {
            setHistory([]);
            setConfirmClear(false);
        } else {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000); // Reset after 3 seconds
        }
    }, [confirmClear]);

    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    }, [theme]);

    const isUsingDefaultModels = () => {
        if (trainingFiles.length === 0) return false;
        return trainingFiles[0].name.startsWith('Modelo Padrão -');
    };

    const fileToGenerativePart = async (file: File) => {
        const base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result.split(',')[1]);
                } else {
                    reject(new Error('FileReader result is not a string'));
                }
            };
            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: {
                data: base64String,
                mimeType: file.type
            }
        };
    };

    const fileToGenerativePartV2 = async (file: File): Promise<{ inlineData: { data: string; mimeType: string; } } | null> => {
        try {
            let base64Data: string;
            let mimeType = file.type;

            const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith('.docx');
            const isOdt = file.type === "application/vnd.oasis.opendocument.text" || file.name.toLowerCase().endsWith('.odt');
            
            if (isDocx || isOdt) {
                let textContent = '';
                const arrayBuffer = await file.arrayBuffer();
                if (isDocx) {
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    textContent = result.value;
                } else { 
                     const zip = await JSZip.loadAsync(arrayBuffer);
                     const contentXml = await zip.file("content.xml")?.async("string");
                     if (contentXml) {
                         const parser = new DOMParser();
                         const xmlDoc = parser.parseFromString(contentXml, "application/xml");
                         textContent = xmlDoc.documentElement.textContent;
                     } else {
                         throw new Error("content.xml não encontrado no arquivo ODT.");
                     }
                }
                base64Data = btoa(unescape(encodeURIComponent(textContent)));
                mimeType = 'text/plain';
            } else {
                base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = err => reject(err);
                    reader.readAsDataURL(file);
                });
            }

            return {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            };
        } catch (err) {
            console.error(`Error processing file ${file.name}:`, err);
            return null;
        }
    };


    const trainingFileToGenerativePart = (trainingFile: TrainingFile) => {
        return {
            inlineData: {
                data: trainingFile.base64Data,
                mimeType: trainingFile.type
            }
        };
    };
    
    // --- REPORT GENERATOR HANDLERS ---
    const handleInqueritoFileChange = (event: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = event.target as HTMLInputElement;
        if (!target.files) return;

        const newFiles = Array.from(target.files);
        let updatedFiles = [...inqueritoFiles];
        let localErrorMessages: string[] = [];

        newFiles.forEach(file => {
            if (file.type === "application/pdf") {
                if (!updatedFiles.some(existingFile => existingFile.name === file.name)) {
                    updatedFiles.push(file);
                } else {
                    localErrorMessages.push(`Arquivo de inquérito '${file.name}' já foi adicionado.`);
                }
            } else {
                localErrorMessages.push(`Arquivo de inquérito '${file.name}' ignorado: apenas PDFs são aceitos.`);
            }
        });

        setInqueritoFiles(updatedFiles);

        const currentErrors = error.split('\n').filter(Boolean);
        const newErrorState = [...currentErrors, ...localErrorMessages].join('\n');

        if (localErrorMessages.length > 0) {
             setError(newErrorState);
        } else if (!newErrorState.includes("apenas PDFs são aceitos")) {
            const nonPdfErrors = currentErrors.filter(err => !err.includes("apenas PDFs são aceitos") && !err.includes("já foi adicionado"));
            setError(nonPdfErrors.join('\n'));
        }

        target.value = '';
    };

    const removeInqueritoFile = (fileNameToRemove: string) => {
        setInqueritoFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
        setError(prevError => {
            const errorsArray = prevError.split('\n').filter(Boolean);
            const filteredErrors = errorsArray.filter(e => !e.includes(`'${fileNameToRemove}'`));
            return filteredErrors.join('\n');
        });
    };

    const handleReportOptionChange = (optionKey: keyof ReportOptionsState, isChecked: boolean) => {
        setReportOptions(prev => {
            const newState = { ...prev }; 

            newState[optionKey] = isChecked;

            const mutuallyExclusiveReportTypes: (keyof ReportOptionsState)[] = [
                'relatorioFinalJuiz',
                'despachoAPF',
                'relatorioInvestigacaoDelegado',
                'relatorioInvestigacaoPAI',
                'relatorioProcedimentoAdministrativo'
            ];

            if (mutuallyExclusiveReportTypes.includes(optionKey) && isChecked) {
                mutuallyExclusiveReportTypes.forEach(keyInGroup => {
                    if (keyInGroup !== optionKey) {
                        newState[keyInGroup] = false;
                    }
                });
            }

            if (optionKey === 'comIndiciamento' && isChecked) {
                newState.semIndiciamento = false;
            } else if (optionKey === 'semIndiciamento' && isChecked) {
                newState.comIndiciamento = false;
            }

            return newState;
        });
    };

    const handleGenerateReport = useCallback(async () => {
        if (inqueritoFiles.length === 0) {
            setError('Por favor, carregue o(s) arquivo(s) do inquérito policial (PDF).');
            return;
        }

        setIsLoading(true);
        setError('');
        setGeneratedReport('');
        setCopySuccess('');
        setTrainingFileWarning('');

        try {
            const inqueritoFilePartsPromises = inqueritoFiles.map(file => fileToGenerativePart(file));
            const resolvedInqueritoFileParts = (await Promise.all(inqueritoFilePartsPromises))
                .filter(part => part !== null) as NonNullable<Awaited<ReturnType<typeof fileToGenerativePart>>>[];


            if (resolvedInqueritoFileParts.length === 0 && inqueritoFiles.length > 0) {
                 setError('Falha ao processar o(s) arquivo(s) de inquérito. Verifique se são PDFs válidos e tente novamente.');
                 setIsLoading(false);
                 return;
            }
             if (resolvedInqueritoFileParts.length !== inqueritoFiles.length) {
                setTrainingFileWarning(prev => prev + 'Atenção: Alguns arquivos de inquérito não puderam ser processados e foram ignorados.\n');
            }


            const parts: any[] = [];
            let promptContent = MASTER_PROMPT;
            promptContent += `### Tarefa Específica: Geração de Documento Policial\nBaseado na sua persona e nas diretrizes acima, sua tarefa agora é gerar um documento específico com base nos arquivos do inquérito/APF fornecidos e nas opções selecionadas pelo usuário.\n\n`;

            let specificDirectives = "### Diretrizes Específicas para Este Documento (baseado nas opções selecionadas):\n";
            let hasSpecificDirectives = false;

            if (reportOptions.relatorioFinalJuiz) {
                specificDirectives += "- TIPO: Relatório Final. DESTINATÁRIO PRINCIPAL: Juiz. Adequar linguagem, formalidade e foco para um magistrado.\n"; hasSpecificDirectives = true;
            }
            if (reportOptions.despachoAPF) {
                specificDirectives += "- TIPO: Despacho em Auto de Prisão em Flagrante. EMISSOR: Delegado de Polícia Plantonista. DESTINATÁRIO: Juiz Plantonista.\n";
                specificDirectives += "  - CONTEÚDO ESSENCIAL: O despacho deve comunicar formalmente a lavratura do APF e submetê-lo à apreciação judicial. Incluir: breve resumo dos fatos que levaram à prisão; identificação do(s) conduzido(s) e vítima(s); capitulação penal provisória; confirmação do cumprimento das formalidades legais (comunicação da prisão, nota de culpa, direitos do preso); encaminhamento do APF para análise. Se pertinente e fundamentado, pode incluir representação pela conversão da prisão em flagrante em preventiva ou sugestão de medidas cautelares diversas. O foco é a comunicação e submissão do APF.\n";
                hasSpecificDirectives = true;
            }
            if (reportOptions.relatorioInvestigacaoDelegado) {
                specificDirectives += "- TIPO: Relatório de Investigação. DESTINATÁRIO PRINCIPAL: Delegado de Polícia. Manter linguagem técnica policial.\n"; hasSpecificDirectives = true;
            }
            if (reportOptions.relatorioInvestigacaoPAI) {
                specificDirectives += "- TIPO: Relatório de Investigação de PAI (Procedimento Administrativo de Infração). DESTINATÁRIO PRINCIPAL: Promotor de Justiça. Foco na apuração da infração administrativa.\n"; hasSpecificDirectives = true;
            }
            if (reportOptions.relatorioProcedimentoAdministrativo) {
                specificDirectives += "- TIPO: Relatório de Procedimento Administrativo (SAD/PAD). DESTINATÁRIO PRINCIPAL: Autoridade instauradora/julgadora do procedimento. Foco na apuração dos fatos no âmbito administrativo disciplinar ou sindicância.\n";
                specificDirectives += "  - **ÊNFASE ESPECIAL PARA SAD/PAD**: Se documentos de treinamento forem fornecidos, e eles se assemelharem a relatórios de Sindicância (SAD) ou Procedimento Administrativo Disciplinar (PAD) - especialmente no que tange a estrutura com seções como 'Da Instrução', 'Dos Depoimentos' (ou seções de conteúdo similar), e 'Da Conclusão' - ** dê prioridade máxima a seguir esse padrão estrutural, de formatação e de estilo**. O objetivo é que o relatório gerado seja muito similar em formato e tom aos exemplos de SAD/PAD fornecidos nos arquivos de treinamento. O conteúdo factual ainda deve ser derivado dos autos do inquérito/procedimento principal e das considerações do usuário.\n";
                hasSpecificDirectives = true;
            }


            if (reportOptions.comIndiciamento && !reportOptions.despachoAPF) { 
                specificDirectives += `- CONCLUSÃO PRINCIPAL: Com Indiciamento. Detalhar o indiciamento com base no crime/lei/artigo: '${indiciamentoDetails || "Não especificado pelo usuário, determine a partir do inquérito"}'. Fundamentar a decisão de indiciar.\n`;
                hasSpecificDirectives = true;
            } else if (reportOptions.semIndiciamento && !reportOptions.despachoAPF) {
                specificDirectives += "- CONCLUSÃO PRINCIPAL: Sem Indiciamento. Justificar a ausência de elementos para o indiciamento ou sugerir arquivamento/novas diligências.\n"; hasSpecificDirectives = true;
            }

            if (reportOptions.semAutoria && !reportOptions.despachoAPF) {
                specificDirectives += "- FOCO ADICIONAL: Sem Autoria Identificada. Detalhar as diligências realizadas para identificar a autoria e a situação atual da investigação quanto a este ponto.\n"; hasSpecificDirectives = true;
            }

            if (reportOptions.pedidoQuebraSigilo) {
                specificDirectives += "- OBJETIVO CENTRAL: Pedido de Quebra de Sigilo (Telefônico, Telemático, Bancário, Fiscal, etc.). O documento deve ser uma representação formal e fundamentada. Inclua seções para: Objeto do Sigilo, Justificativa da Indispensabilidade da Medida, Período, Pessoas/Empresas Alvo, Dados Específicos Requeridos, Relevância para a Investigação (fumus comissi delicti e periculum in mora). Argumente sobre a impossibilidade de obter as informações por outros meios.\n"; hasSpecificDirectives = true;
            }
             if (reportOptions.pedidoMBA) {
                specificDirectives += "- OBJETIVO CENTRAL: Pedido de Medidas Assecuratórias / Busca e Apreensão. O documento deve ser uma representação formal e fundamentada. Detalhe: Objeto da Medida (bens a serem sequestrados/arrestados/hipotecados OU local da busca e objetos a serem apreendidos), Justificativa (fumus comissi delicti - indícios do crime e da origem ilícita dos bens ou da relação dos objetos/local com o crime; periculum in mora - risco de dilapidação patrimonial, desaparecimento de provas). Especificar os investigados, os crimes e a conexão com os bens/locais. Se Busca e Apreensão, fundamentar a necessidade e a expectativa de encontrar elementos probatórios relevantes.\n"; hasSpecificDirectives = true;
            }
            if (reportOptions.pedidoPrisaoPreventiva) {
                specificDirectives += "- OBJETIVO CENTRAL: Pedido de Prisão Preventiva. O documento deve ser uma representação formal e fundamentada. Detalhe: Fumus Comissi Delicti (prova da materialidade e indícios suficientes de autoria), Periculum Libertatis (fundamentar com base nos requisitos do Art. 312 do CPP: garantia da ordem pública, da ordem econômica, por conveniência da instrução criminal, ou para assegurar a aplicação da lei penal). Apresentar os fatos e argumentos que justificam cada requisito.\n"; hasSpecificDirectives = true;
            }
            if (reportOptions.pedidoPrisaoTemporaria) {
                specificDirectives += "- OBJETIVO CENTRAL: Pedido de Prisão Temporária. O documento deve ser uma representação formal e fundamentada. Detalhe os requisitos da Lei 7.960/89: Inciso I (imprescindível para as investigações do inquérito policial), Inciso II (quando o indicado não tiver residência fixa ou não fornecer elementos necessários ao esclarecimento de sua identidade), ou Inciso III (when houver fundadas razões, de acordo com qualquer prova admitida na legislação penal, de autoria ou participação do indiciado nos crimes listados na lei). Especificar o prazo da prisão e os crimes investigados que se enquadram na lei.\n"; hasSpecificDirectives = true;
            }

            if (hasSpecificDirectives) {
                promptContent += specificDirectives + "\n";
            }

            let generalInstructions = "### Instruções de Estrutura (adapte conforme o tipo de documento):\n";
            const isSpecificRequest = reportOptions.pedidoQuebraSigilo || reportOptions.pedidoMBA || reportOptions.pedidoPrisaoPreventiva || reportOptions.pedidoPrisaoTemporaria || reportOptions.despachoAPF;

            if (isSpecificRequest) {
                generalInstructions += "1. FOCO NO PEDIDO/DESPACHO: A estrutura deve servir à fundamentação do pedido/comunicação. Certifique-se de que todos os requisitos legais e argumentativos para o tipo específico de documento sejam abordados. Sempre inclua uma breve descrição dos fatos investigados/flagrados para contextualizar.\n";
            } else {
                generalInstructions += "1. ESTRUTURA BASE DE RELATÓRIO (se não for um pedido ou despacho específico que demande estrutura própria): Use seções como 'Dos Fatos', 'Das Diligências', 'Da Análise Técnico-Jurídica' (especialmente se houver indiciamento, fundamentando-o), e 'Da Conclusão' (que pode ser a sugestão de arquivamento, novas diligências, o próprio indiciamento, ou o encaminhamento conforme o destinatário).\n";
            }
            generalInstructions += `2. EXTRAÇÃO DE DADOS DO INQUÉRITO/APF PRINCIPAL: Baseie o conteúdo factual do documento (nomes, datas, locais, eventos, depoimentos) PRIMARIAMENTE nas informações contidas NOS ARQUIVOS PDF do inquérito/APF principal fornecidos (podem ser múltiplas partes, trate-os como um todo contínuo).\n`;
            promptContent += generalInstructions + "\n";

            const processableTrainingFileObjects: { name: string, part: NonNullable<ReturnType<typeof trainingFileToGenerativePart>> }[] = [];
            const skippedTrainingFileNames: string[] = [];

            if (trainingFiles.length > 0) {
                trainingFiles.forEach(tf => {
                    if (supportedMimeTypesForGeminiApi.includes(tf.type)) {
                        const part = trainingFileToGenerativePart(tf);
                        processableTrainingFileObjects.push({ name: tf.name, part });
                    } else {
                        skippedTrainingFileNames.push(tf.name);
                    }
                });
                if (skippedTrainingFileNames.length > 0) {
                     setTrainingFileWarning(prev => prev + `Atenção: Os seguintes arquivos de treinamento foram carregados mas não puderam ser enviados para análise de estilo/contexto devido ao formato não suportado diretamente pela IA: ${skippedTrainingFileNames.join(', ')}. Para análise baseada em conteúdo, use PDF, TXT, DOCX ou ODT.\n`);
                }
            }

            if (processableTrainingFileObjects.length > 0) {
                promptContent += `\n### Documentos de Treinamento Fornecidos (Alta Prioridade para Estilo e Estrutura):\nOs seguintes documentos de treinamento (PDF/TXT) foram fornecidos. É CRUCIAL que você ANALISE-OS CUIDADOSAMENTE e USE-OS COMO MODELO PRINCIPAL para determinar o ESTILO DE ESCRITA, a ESTRUTURA DO DOCUMENTO (organização de seções, parágrafos, etc.), o TOM (formal, objetivo, etc.) e a LINGUAGEM TÉCNICA (jargões, termos jurídicos/policiais específicos) do relatório a ser gerado. Tente EMULAR o formato e a apresentação desses exemplos o mais fielmente possível.\n\nIMPORTANTE: Embora o estilo e a estrutura devam seguir os exemplos de treinamento, o CONTEÚDO FACTUAL (nomes, datas, locais, descrições de eventos específicos, etc.) do relatório deve ser extraído PRIMARIAMENTE dos arquivos do inquérito policial e das considerações do usuário. NÃO copie dados factuais dos documentos de treinamento para o relatório final, a menos que explicitamente instruído nas considerações do usuário. Se houver um conflito entre o estilo/estrutura dos documentos de treinamento e as diretrizes específicas para o tipo de relatório solicitado, priorize as diretrizes específicas, mas tente incorporar o estilo dos documentos de treinamento dentro dessa estrutura.\n`;
            } else if (trainingFiles.length > 0 && skippedTrainingFileNames.length === trainingFiles.length) { 
                promptContent += `\n### Documentos de Treinamento Fornecidos:\nO usuário forneceu documentos de treinamento, mas em formatos que não puderam ser processados (ex: DOC, formatos de imagem). Como o conteúdo desses arquivos não pôde ser analisado para estilo/estrutura, aplique um estilo formal e profissional genérico, adequado ao tipo de documento solicitado, focando primariamente no conteúdo do inquérito e nas considerações do usuário.\n`;
            } else { 
                 promptContent += `\n### Documentos de Treinamento Fornecidos:\nNenhum documento de treinamento processável (PDF/TXT) foi fornecido. O relatório será gerado com base nas diretrizes, no inquérito e nas suas considerações, utilizando um estilo formal padrão.\n`;
            }

            promptContent += `\n### Considerações do Usuário (Prioridade Máxima):\nAs seguintes considerações fornecidas pelo usuário DEVEM ser incorporadas de forma proeminente e priorizadas no documento. Se houver contradição com informações do inquérito principal, priorize as considerações do usuário, mas pode ser útil mencionar a discrepância se for relevante para a análise.\n`;

            parts.push({ text: promptContent });
            parts.push({ text: userConsiderations || "Nenhuma consideração adicional específica fornecida pelo usuário." });
            parts.push({ text: "\n--- Fim das Considerações do Usuário e Instruções Iniciais --- \n\n--- Início do Conteúdo dos Arquivos do Inquérito Policial (Fornecidos Pelo Usuário): ---" });

            resolvedInqueritoFileParts.forEach((part, index) => {
                parts.push({ text: `\n\n--- Parte ${index + 1} do Inquérito Policial (${inqueritoFiles[index]?.name || 'Nome Desconhecido'}) ---` });
                parts.push(part);
                parts.push({ text: `\n--- Fim da Parte ${index + 1} do Inquérito Policial ---` });
            });
            parts.push({ text: "\n--- Fim do Conteúdo dos Arquivos do Inquérito Policial: ---" });


            if (processableTrainingFileObjects.length > 0) {
                parts.push({ text: "\n\n--- Início dos Conteúdos dos Documentos de Treinamento (PDF/TXT Processados): ---" });
                processableTrainingFileObjects.forEach((trainingFileDetail, index) => {
                    parts.push({ text: `\n\n--- Documento de Treinamento Processado ${index + 1} (${trainingFileDetail.name}) ---` });
                    parts.push(trainingFileDetail.part);
                    parts.push({ text: `\n--- Fim do Documento de Treinamento Processado ${index + 1} ---` });
                });
                parts.push({ text: "\n--- Fim dos Conteúdos dos Documentos de Treinamento Processados: ---" });
            }

            const geminiInternalResponse: GeminiGenerateContentResponse = await ai.models.generateContent({ 
                model: 'gemini-3-pro-preview',
                contents: { parts: parts }
            });

            const reportText = geminiInternalResponse.text; 

            if (reportText) {
                setGeneratedReport(reportText);
                setError(''); 
                addToHistory('Relatório', reportText, inqueritoFiles.map(f => f.name).join(', '));
            } else {
                let specificError = "O modelo não retornou conteúdo textual.";
                if (geminiInternalResponse.promptFeedback?.blockReason) {
                    specificError = `A geração de conteúdo foi bloqueada. Razão: ${geminiInternalResponse.promptFeedback.blockReason}.`;
                    if (geminiInternalResponse.promptFeedback.safetyRatings && geminiInternalResponse.promptFeedback.safetyRatings.length > 0) {
                        specificError += ` Detalhes: ${geminiInternalResponse.promptFeedback.safetyRatings.map(r => `${r.category} (${r.probability})`).join(', ')}.`;
                    }
                } else if (geminiInternalResponse.candidates && geminiInternalResponse.candidates.length > 0) {
                    const firstCandidate = geminiInternalResponse.candidates[0];
                    if (firstCandidate.finishReason && firstCandidate.finishReason !== FinishReason.STOP && firstCandidate.finishReason !== FinishReason.FINISH_REASON_UNSPECIFIED) {
                         specificError = `A geração de conteúdo terminou inesperadamente. Razão: ${firstCandidate.finishReason}.`;
                    }
                }
                setError(specificError + " Verifique os arquivos de entrada, as opções selecionadas ou tente simplificar as considerações. Consulte o console do navegador para mais detalhes técnicos se o problema persistir.");
                setGeneratedReport('');
            }

        } catch (err: any) {
            console.error("Erro detalhado ao gerar relatório:", err); 
            let errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
                errorMessage = "Cota da API excedida. O limite de uso gratuito ou do seu plano foi atingido. Por favor, aguarde alguns instantes e tente novamente, ou verifique os limites da sua chave de API no Google AI Studio.";
            }

            setError(`Erro ao gerar relatório: ${errorMessage}. Verifique o console do navegador para detalhes técnicos completos.`);
            setGeneratedReport('');
        } finally {
            setIsLoading(false);
        }
    }, [inqueritoFiles, userConsiderations, ai, trainingFiles, reportOptions, indiciamentoDetails, MASTER_PROMPT]);

    const handleCopyReport = () => {
        if (generatedReport) {
            navigator.clipboard.writeText(generatedReport)
                .then(() => {
                    setCopySuccess('Relatório copiado para a área de transferência!');
                    setTimeout(() => setCopySuccess(''), 3000);
                })
                .catch(err => {
                    setError('Falha ao copiar o relatório.');
                    console.error('Copy failed', err);
                });
        }
    };

    const handleClearReport = () => {
        setGeneratedReport('');
        setCopySuccess('');
        setInqueritoFiles([]); 
        setError(''); 
    };

    const handleDownloadDocxGeneric = async (content: string, fileName: string) => {
        if (!content) return;
        setIsDownloadingDocx(true);
        setError('');
        setCopySuccess('');

        const createTextRuns = (text: string): TextRun[] => {
            const runs: TextRun[] = [];
            const regex = /(\*\*)(.*?)\*\*|(\*)(.*?)\*/g;
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    runs.push(new TextRun(text.substring(lastIndex, match.index)));
                }

                const boldText = match[2];
                const italicText = match[4];

                if (boldText !== undefined) {
                    runs.push(new TextRun({ text: boldText, bold: true }));
                } else if (italicText !== undefined) {
                    runs.push(new TextRun({ text: italicText, italics: true }));
                }

                lastIndex = regex.lastIndex;
            }

            if (lastIndex < text.length) {
                runs.push(new TextRun(text.substring(lastIndex)));
            }
            
            if (runs.length === 0) {
                runs.push(new TextRun(text));
            }

            return runs;
        };

        try {
            const paragraphs: Paragraph[] = [];
            const lines = content.split('\n');
            let lastLineWasBlank = true;

            for (const line of lines) {
                let trimmedLine = line.trim();

                if (trimmedLine.startsWith('#')) {
                    const level = trimmedLine.match(/^#+/)?.[0].length || 0;
                    const text = trimmedLine.replace(/^#+\s*/, '');
                    let headingLevel, spacing;
                    switch (level) {
                        case 1: headingLevel = HeadingLevel.HEADING_1; spacing = { before: 360, after: 180 }; break;
                        case 2: headingLevel = HeadingLevel.HEADING_2; spacing = { before: 240, after: 120 }; break;
                        case 3: headingLevel = HeadingLevel.HEADING_3; spacing = { before: 200, after: 100 }; break;
                        default: headingLevel = HeadingLevel.HEADING_4; spacing = { before: 180, after: 80 }; break;
                    }
                     paragraphs.push(new Paragraph({
                        children: createTextRuns(text),
                        heading: headingLevel,
                        spacing: spacing,
                    }));
                    lastLineWasBlank = false;
                } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                    const text = trimmedLine.substring(2);
                    paragraphs.push(new Paragraph({
                        children: createTextRuns(text),
                        bullet: { level: 0 },
                        indent: { left: 720, hanging: 360 },
                        spacing: { line: 360 },
                    }));
                    lastLineWasBlank = false;
                } else if (trimmedLine.length > 0) {
                    paragraphs.push(new Paragraph({
                        children: createTextRuns(trimmedLine),
                        spacing: { after: 120, line: 360 }, 
                        alignment: AlignmentType.JUSTIFIED,
                    }));
                    lastLineWasBlank = false;
                } else {
                    if (!lastLineWasBlank) {
                        paragraphs.push(new Paragraph({ text: "" }));
                    }
                    lastLineWasBlank = true;
                }
            }


            const doc = new Document({
                creator: "Gerador de Relatório Policial",
                title: "Documento Policial",
                description: "Documento gerado automaticamente",
                styles: {
                    default: {
                        document: {
                            run: { size: 24, font: "Arial" }, 
                            paragraph: {
                                spacing: { after: 120 },
                                alignment: AlignmentType.JUSTIFIED,
                            },
                        },
                    },
                    paragraphStyles: [
                        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 28, bold: true }, paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
                        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { size: 26, bold: true }, paragraph: { spacing: { before: 200, after: 100 }, alignment: AlignmentType.LEFT } },
                        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { size: 24, bold: true }, paragraph: { spacing: { before: 180, after: 80 }, alignment: AlignmentType.LEFT } },
                        { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", run: { size: 24, bold: true, italics: true }, paragraph: { alignment: AlignmentType.LEFT } },
                    ],
                },
                sections: [{
                    properties: {
                        page: {
                            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                            size: { orientation: PageOrientation.PORTRAIT },
                        },
                    },
                    children: paragraphs,
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setCopySuccess('Documento baixado como DOCX!');
             setTimeout(() => setCopySuccess(''), 3000);

        } catch (err) {
            console.error("Error generating DOCX:", err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Erro ao gerar DOCX: ${errorMessage}`);
        } finally {
            setIsDownloadingDocx(false);
        }
    };
    
    // --- TRAINING HANDLERS ---
    const handleAddTrainingText = useCallback(() => {
        if (!trainingTextInput.trim()) return;

        const currentTotalSize = trainingFiles.reduce((acc, file) => acc + file.size, 0);
        const newText = trainingTextInput.trim();
        const newTextSize = new Blob([newText]).size;

        if (currentTotalSize + newTextSize > MAX_LOCAL_STORAGE_SIZE) {
            setLocalStorageError(`Não foi possível adicionar o texto. Espaço de armazenamento local excederia o limite.`);
            return;
        }

        const newFileName = `Texto Colado ${trainingFiles.filter(f => f.name.startsWith("Texto Colado")).length + 1}.txt`;

        if (trainingFiles.some(tf => tf.name === newFileName)) {
            setTrainingFileWarning(`Um modelo com nome '${newFileName}' já existe.`);
            return;
        }

        const base64Data = btoa(unescape(encodeURIComponent(newText)));

        setTrainingFiles(prev => [...prev, {
            name: newFileName,
            type: 'text/plain',
            base64Data,
            size: newTextSize
        }]);

        setTrainingTextInput('');
        setTrainingFileWarning('');
        setLocalStorageError('');
    }, [trainingTextInput, trainingFiles]);

    const handleTrainingFileChange = async (event: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = event.target as HTMLInputElement;
        if (!target.files) return;

        const newFiles = Array.from(target.files);
        setTrainingFileWarning('');
        setLocalStorageError('');

        const newTrainingFiles: TrainingFile[] = [...trainingFiles];
        let filesAddedCount = 0;
        let totalSizeSoFar = newTrainingFiles.reduce((acc, f) => acc + f.size, 0);

        for (const file of newFiles) {
            if (!acceptedUploadTypesForInput.includes(file.type)) {
                setTrainingFileWarning(prev => prev + `Arquivo '${file.name}' (${file.type}) ignorado: tipo não aceito para upload. Aceitos: PDF, TXT, DOC, DOCX, ODT.\n`);
                continue;
            }
            if (newTrainingFiles.some(tf => tf.name === file.name)) {
                setTrainingFileWarning(prev => prev + `Arquivo '${file.name}' já existe no treinamento e não será adicionado novamente.\n`);
                continue;
            }

            try {
                let processedFile: Omit<TrainingFile, 'size'> & { size: number | null } = {
                    name: file.name,
                    type: file.type,
                    base64Data: '',
                    size: null
                };

                const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith('.docx');
                const isOdt = file.type === "application/vnd.oasis.opendocument.text" || file.name.toLowerCase().endsWith('.odt');

                if (isDocx) {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    const textContent = result.value;
                    processedFile.base64Data = btoa(unescape(encodeURIComponent(textContent)));
                    processedFile.type = 'text/plain';
                    processedFile.size = new Blob([textContent]).size;
                } else if (isOdt) {
                    const zip = await JSZip.loadAsync(file);
                    const contentXml = await zip.file("content.xml")?.async("string");
                    if (contentXml) {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(contentXml, "application/xml");
                        const textContent = xmlDoc.documentElement.textContent;
                        processedFile.base64Data = btoa(unescape(encodeURIComponent(textContent)));
                        processedFile.type = 'text/plain';
                        processedFile.size = new Blob([textContent]).size;
                    } else {
                        throw new Error("content.xml não encontrado no arquivo ODT.");
                    }
                } else {
                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === 'string') {
                                resolve(reader.result.split(',')[1]);
                            } else {
                                reject(new Error('FileReader result is not a string'));
                            }
                        };
                        reader.onerror = err => reject(err);
                        reader.readAsDataURL(file);
                    });
                    processedFile.base64Data = base64Data;
                    processedFile.size = file.size;
                }
                
                if (processedFile.size === null) { throw new Error("Não foi possível determinar o tamanho do arquivo."); }

                if (totalSizeSoFar + processedFile.size > MAX_LOCAL_STORAGE_SIZE) {
                    setLocalStorageError(`Não foi possível adicionar '${file.name}'. Espaço de armazenamento local excederia o limite. Remova arquivos existentes ou limpe o treinamento.`);
                    continue;
                }

                newTrainingFiles.push(processedFile as TrainingFile);
                filesAddedCount++;
                totalSizeSoFar += processedFile.size;

            } catch (err) {
                 console.error(`Error processing file ${file.name}:`, err);
                 setTrainingFileWarning(prev => prev + `Erro ao processar o arquivo '${file.name}'. O arquivo pode estar corrompido ou em um formato não suportado.\n`);
            }
        }

        if (filesAddedCount > 0) {
            setTrainingFiles(newTrainingFiles);
        }
        target.value = '';
    };

    const removeTrainingFile = (fileNameToRemove: string) => {
        setTrainingFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
    };

    const clearAllTrainingData = () => {
        setTrainingFiles([]);
        setTrainingFileWarning('Todos os dados de treinamento foram removidos.');
        setTimeout(() => setTrainingFileWarning(''), 3000);
    };
    
    // --- ANALYZER HANDLERS ---
    const handleAnalyzerFileChange = (event: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = event.target as HTMLInputElement;
        if (!target.files) return;
        const newFiles = Array.from(target.files);
        setAnalyzerFiles(prev => {
            const existingNames = new Set(prev.map(f => f.name));
            const filteredNewFiles = newFiles.filter(f => !existingNames.has(f.name));
            return [...prev, ...filteredNewFiles];
        });
        target.value = '';
    };

    const removeAnalyzerFile = (fileNameToRemove: string) => {
        setAnalyzerFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
    };
    
    const handleAnalyzeDocument = useCallback(async () => {
        if (analyzerFiles.length === 0) {
            setAnalyzerError('Por favor, carregue ao menos um arquivo para análise.');
            return;
        }
        setIsAnalyzing(true);
        setAnalyzerError('');
        setAnalyzerSummary('');

        try {
            let prompt = MASTER_PROMPT + `### Tarefa Específica: Análise de Documentos\nCom base na sua persona e nas diretrizes acima, sua tarefa é analisar o conteúdo dos documentos fornecidos a seguir e gerar um resumo analítico e fundamentado. O resultado deve ser uma peça de texto coesa que poderia ser usada como base para um relatório ou despacho.\n`;

            if (analyzerConsiderations.trim()) {
                prompt += `\n\n**Considerações do Usuário (Prioridade Alta):** O usuário forneceu as seguintes instruções que devem guiar sua análise e ser abordadas no resumo. Dê atenção especial a estes pontos: "${analyzerConsiderations}"`;
            }
            
            const filePartsPromises = analyzerFiles.map(fileToGenerativePartV2);
            const resolvedFileParts = (await Promise.all(filePartsPromises)).filter(part => part !== null);
            
            if (resolvedFileParts.length === 0) {
                throw new Error("Nenhum arquivo pôde ser processado. Verifique os formatos (PDF, DOCX, ODT, TXT).");
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: [{ text: prompt }, ...resolvedFileParts] }
            });

            setAnalyzerSummary(response.text);
            addToHistory('Análise', response.text, analyzerFiles.map(f => f.name).join(', '));

        } catch (err: any) {
            let errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
                errorMessage = "Cota da API excedida. O limite de uso gratuito ou do seu plano foi atingido. Por favor, aguarde alguns instantes e tente novamente.";
            }

            setAnalyzerError(`Erro ao analisar documento: ${errorMessage}`);
        } finally {
            setIsAnalyzing(false);
        }
    }, [analyzerFiles, ai, analyzerConsiderations, MASTER_PROMPT]);

    const handleCopySummary = () => {
        if (analyzerSummary) {
            navigator.clipboard.writeText(analyzerSummary).then(() => {
                setCopySuccess('Resumo copiado!');
                setTimeout(() => setCopySuccess(''), 2000);
            });
        }
    };
    
    const handleClearSummary = () => {
        setAnalyzerSummary('');
        setAnalyzerFiles([]);
        setAnalyzerError('');
        setAnalyzerConsiderations('');
    };

    // --- CONCATENATOR HANDLERS ---
    const handleConcatenatorMainFileChange = (event: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            setConcatenatorMainFile(target.files[0]);
        }
        target.value = '';
    };

    const removeConcatenatorMainFile = () => setConcatenatorMainFile(null);

    const handleConcatenatorAdditionalFilesChange = (event: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = event.target as HTMLInputElement;
        if (!target.files) return;
        const newFiles = Array.from(target.files);
        setConcatenatorAdditionalFiles(prev => {
            const existingNames = new Set(prev.map(f => f.name));
            const filteredNewFiles = newFiles.filter(f => !existingNames.has(f.name));
            return [...prev, ...filteredNewFiles];
        });
        target.value = '';
    };

    const removeConcatenatorAdditionalFile = (fileNameToRemove: string) => {
        setConcatenatorAdditionalFiles(prev => prev.filter(f => f.name !== fileNameToRemove));
    };

    const handleConcatenateDocuments = useCallback(async () => {
        if (!concatenatorMainFile || concatenatorAdditionalFiles.length === 0) {
            setConcatenatorError('É necessário carregar um relatório principal e ao menos um documento adicional.');
            return;
        }
        setIsConcatenating(true);
        setConcatenatorError('');
        setConcatenatedReport('');

        try {
            let prompt = MASTER_PROMPT + `### Tarefa Específica: Consolidação de Documentos
Sua tarefa é a seguinte: você receberá um 'Relatório Principal' e um ou mais 'Documentos Adicionais'. Com base na sua persona de Delegado, seu objetivo é gerar um 'Relatório Consolidado' que seja uma versão aprimorada do 'Relatório Principal', seguindo estas regras:
**Regras Fundamentais:**
1.  **Preservação conteúdo do Original:** O 'Relatório Consolidado' DEVE conter **todo o conteúdo e a estrutura originais** do 'Relatório Principal'. Nada do conteúdo original do relatório principal deve ser removido. Ele é a base .
2.  **Adição Inteligente:** Analise os 'Documentos Adicionais'. Para cada informação encontrada neles, determine se ela se relaciona com algum tópico ou seção já existente no 'Relatório Principal'.
3.  **Integração Coesa:** Se uma informação do documento adicional for relevante para uma seção existente, **adicione** essa nova informação ao local apropriado no 'Relatório Principal'. A adição deve ser feita de forma que complemente o texto original.
4.  **Não Duplicar:** Não adicione informações que já estão presentes no relatório principal.
5.  **Manter o Formato:** O resultado final deve manter a formatação (markdown) e o estilo do 'Relatório Principal'.
O objetivo final é o 'Relatório Principal', completo, com acréscimos pontuais e relevantes dos documentos adicionais.`;

            if (concatenatorConsiderations.trim()) {
                prompt += `\n\n**Considerações do Usuário (Prioridade Alta):** Além das regras fundamentais, siga estas diretrizes específicas do usuário ao mesclar os documentos: "${concatenatorConsiderations}"`;
            }

            prompt += "\n\nAbaixo estão os documentos.";

            const allFiles = [concatenatorMainFile, ...concatenatorAdditionalFiles];
            const filePartsPromises = allFiles.map(fileToGenerativePartV2);
            const resolvedFileParts = (await Promise.all(filePartsPromises)).filter(part => part !== null);
            
            if (resolvedFileParts.length < 2) {
                 throw new Error("Falha ao processar os arquivos necessários. Verifique os formatos.");
            }
            
            const parts: any[] = [{ text: prompt }];
            resolvedFileParts.forEach((part, index) => {
                const label = index === 0 ? "Relatório Principal" : `Documento Adicional ${index}`;
                parts.push({ text: `\n\n--- Início: ${label} (${allFiles[index].name}) ---`});
                parts.push(part);
                parts.push({ text: `\n--- Fim: ${label} ---`});
            });

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: parts }
            });

            setConcatenatedReport(response.text);
            addToHistory('Concatenação', response.text, concatenatorMainFile?.name + ' + ' + concatenatorAdditionalFiles.length + ' arquivos');

        } catch (err: any) {
            let errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
                errorMessage = "Cota da API excedida. O limite de uso gratuito ou do seu plano foi atingido. Por favor, aguarde alguns instantes e tente novamente.";
            }

            setConcatenatorError(`Erro ao concatenar documentos: ${errorMessage}`);
        } finally {
            setIsConcatenating(false);
        }
    }, [concatenatorMainFile, concatenatorAdditionalFiles, ai, concatenatorConsiderations, MASTER_PROMPT]);

    const handleCopyConcatenated = () => {
        if (concatenatedReport) {
            navigator.clipboard.writeText(concatenatedReport).then(() => {
                setCopySuccess('Relatório copiado!');
                setTimeout(() => setCopySuccess(''), 2000);
            });
        }
    };
    
    const handleClearConcatenated = () => {
        setConcatenatedReport('');
        setConcatenatorMainFile(null);
        setConcatenatorAdditionalFiles([]);
        setConcatenatorError('');
        setConcatenatorConsiderations('');
    };

    // --- FORMALIZER HANDLERS ---
    const handleFormalizeContent = useCallback(async () => {
        if (!formalizerInputText.trim()) {
            setFormalizerError('Por favor, insira o texto a ser formalizado.');
            return;
        }
        setIsFormalizing(true);
        setFormalizerError('');
        setFormalizerOutputText('');

        try {
            let prompt = MASTER_PROMPT + `### Tarefa Específica: Formalização de Conteúdo (REGRAS CRÍTICAS DE FORMATAÇÃO)
**1. PROIBIÇÃO DE NEGRITO:** É terminantemente PROIBIDO o uso de negrito (**) em qualquer parte do texto gerado. Não use negrito para ênfase, títulos, nomes ou qualquer outra finalidade. O texto deve ser plano (plain text).
**2. ESTRUTURA DA RESPOSTA:** O resultado deve conter APENAS o texto formalizado seguido da seção de perguntas sugeridas. Não inclua introduções ou conclusões (ex: "Aqui está o texto...").
**3. SEM MARCADORES NO TEXTO:** Não use listas com marcadores ou hifens para organizar o texto formalizado, a menos que faça parte da narrativa formal.
**4. SUGESTÃO DE PERGUNTAS:** Ao final do texto formalizado, após uma linha em branco, escreva exatamente "Sugestão de perguntas:" (sem negrito). Abaixo deste título, liste perguntas pertinentes que o escrivão possa fazer ao depoente para esclarecer melhor os fatos e aprofundar a investigação.
   - As perguntas devem buscar determinar: Onde, quando, como, por que e quem testemunhou.
   - Em casos de violência doméstica contra a mulher, inclua perguntas específicas sobre: se já foi vítima outras vezes, tempo de relacionamento, se possuem filhos, se residem juntos, situação do imóvel (alugado, cedido, próprio, a quem pertence) e planos futuros de moradia (se retornará para casa ou tem para onde ir).\n`;

            if (formalizerMode === 'depoimento') {
                prompt += `Sua tarefa é reescrever o texto fornecido pelo usuário em forma de DEPOIMENTO POLICIAL.
**Instruções para formato de depoimento:**
1. **Terceira Pessoa:** Sempre em terceira pessoa.
2. **Estrutura:** Inicie as frases com "QUE...".
3. **Sem Destaque:** A palavra "QUE" no início das frases NÃO deve estar em negrito ou destacada de qualquer forma.
4. **Exemplos:** "QUE é Policial Militar, e estava em patrulhamento..."; "QUE ao se deparar com o veículo, efetuou a abordagem do suspeito."; "QUE ao chegar fez contato com a vítima, que relatou...".
5. **Fidelidade:** Preserve integralmente o sentido do texto original.`;
            } else if (formalizerMode === 'reescrever_depoimento') {
                prompt += `Sua tarefa é reescrever um depoimento policial existente, mantendo a estrutura de um relato feito por um depoente e registrado por um escrivão.
**Instruções para reescrita de depoimento:**
1. **Estilo de Relato:** Escreva como se fosse o depoente narrando os fatos, mas com a redação típica de um escrivão (ex: "O depoente afirma...", "Relata o declarante...", ou a narrativa direta dos fatos em terceira pessoa).
2. **Linguagem Natural:** NÃO use linguagem excessivamente formal ou jurídica rebuscada. O texto deve ser simples e direto, refletindo a forma como as pessoas se expressam normalmente, sem termos técnicos desnecessários.
3. **Sem a palavra "QUE":** Diferente do modo de formalização padrão, NÃO utilize a palavra "QUE" para iniciar as frases.
4. **Alterações Sutis:** Mude a estrutura das frases e use sinônimos para que o texto não fique idêntico ao original, mas sem alterar os fatos.
5. **Preservação:** Preserve rigorosamente todos os fatos e a sequência dos acontecimentos narrados.`;
            } else if (formalizerMode === 'historico') {
                prompt += `Sua tarefa é escrever o texto em forma de HISTÓRICO policial.
**Instruções para formato de histórico:**
1. **Estilo Narrativo:** Use um estilo narrativo formal.
2. **Exemplo:** "Relata o comunicante que é Policial Militar, e estava em patrulhamento quando se deparou com o suspeito, efetuando a abordagem deste. Após fez contato com a vítima, que relatou...".
3. **Fidelidade:** Preserve integralmente o sentido do texto original.`;
            } else if (formalizerMode === 'juridica') {
                prompt += `Sua tarefa é reescrever o texto em LINGUAGEM JURÍDICA formal.
**Instruções para linguagem jurídica:**
1. **Formalidade:** Utilize um padrão formal, técnico-jurídico e adequado para documentos policiais oficiais.
2. **Vocabulário:** Substitua gírias e termos coloquiais por vocabulário técnico.
3. **Fidelidade:** Preserve integralmente o sentido do texto original.`;
            }

            if (formalizerShowObservations && formalizerObservations.trim()) {
                prompt += `\n\n**Observações Adicionais do Usuário (Alta Prioridade):** Além das regras acima, siga estas diretrizes específicas do usuário durante a reescrita: "${formalizerObservations}"`;
            }

            prompt += `\n\n--- Início do Texto do Usuário para ser Formalizado ---\n${formalizerInputText}\n--- Fim do Texto do Usuário ---`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: [{ text: prompt }] }
            });

            setFormalizerOutputText(response.text);
            addToHistory('Formalização', response.text, formalizerInputText.substring(0, 50) + '...');

        } catch (err: any) {
            let errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
                errorMessage = "Cota da API excedida. O limite de uso gratuito ou do seu plano foi atingido. Por favor, aguarde alguns instantes e tente novamente.";
            }

            setFormalizerError(`Erro ao formalizar conteúdo: ${errorMessage}`);
        } finally {
            setIsFormalizing(false);
        }
    }, [formalizerInputText, formalizerMode, ai, MASTER_PROMPT, formalizerShowObservations, formalizerObservations]);

    const handleCopyFormalized = () => {
        if (formalizerOutputText) {
            navigator.clipboard.writeText(formalizerOutputText).then(() => {
                setCopySuccess('Texto copiado!');
                setTimeout(() => setCopySuccess(''), 2000);
            });
        }
    };
    
    const handleClearFormalizer = () => {
        setFormalizerOutputText('');
        setFormalizerInputText('');
        setFormalizerMode('depoimento');
        setFormalizerError('');
        setFormalizerShowObservations(false);
        setFormalizerObservations('');
    };

    // --- TRANSCRIPTION HANDLERS ---
    const handleTranscriberFileChange = (event: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => {
        const target = event.target as HTMLInputElement;
        if (!target.files) return;
        const newFiles = Array.from(target.files);
        setTranscriberFiles(prev => {
            const existingNames = new Set(prev.map(f => f.name));
            const filteredNewFiles = newFiles.filter(f => !existingNames.has(f.name));
            return [...prev, ...filteredNewFiles];
        });
        target.value = '';
    };

    const removeTranscriberFile = (fileNameToRemove: string) => {
        setTranscriberFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
    };

    const handleTranscriberOptionChange = (optionKey: keyof typeof transcriberOptions, isChecked: boolean) => {
        setTranscriberOptions(prev => ({ ...prev, [optionKey]: isChecked }));
    };

    const handleTranscribeMedia = useCallback(async () => {
        if (transcriberFiles.length === 0) {
            setTranscriberError('Por favor, carregue ao menos um arquivo de mídia para transcrever.');
            return;
        }
        setIsTranscribing(true);
        setTranscriberError('');
        setTranscribedText('');
        setCopySuccess('');

        try {
            let prompt = `### Papel e Missão (Prioridade Máxima)
1.  **Persona:** Atue como um especialista em transcrição forense. Sua precisão é crucial para investigações policiais.
2.  **Missão Principal:** Transcrever o conteúdo dos arquivos de mídia fornecidos com a máxima fidelidade. O resultado deve ser claro, bem estruturado e pronto para ser anexado a um inquérito policial. Todos os dados são sigilosos.
3.  **Atenção:** A transcrição deve ser literal, focando exclusivamente na captura fiel e exata do diálogo original do arquivo de mídia. Colocar a observação "(inaudível)" caso não tenha certeza do que foi dito.

### Tarefa Específica: Transcrição de Mídia
Você receberá um ou mais arquivos de mídia, cada um delimitado por marcadores que incluem seu nome completo (ex: "--- INÍCIO DO ARQUIVO DE MÍDIA: audio_conversa_1.mp3 ---"). Para CADA arquivo, gere uma seção de transcrição. Siga ESTAS REGRAS ESTRITAMENTE para CADA arquivo:

1.  **Cabeçalho do Arquivo:** Inicie a seção de cada arquivo com um cabeçalho claro, usando o nome completo do arquivo que você encontrará nos marcadores. Formato: \`### Transcrição do Arquivo: NOME_COMPLETO_DO_ARQUIVO_AQUI ###\`.

2.  **Transcrição do Diálogo:**
    *   Crie uma sub-seção chamada \`#### Transcrição do Diálogo ####\`.
    *   O formato do diálogo **DEVE** ser uma lista, com cada fala em uma nova linha, começando com um hífen.

3.  **Formato da Linha de Diálogo (REGRAS GERAIS PARA TODOS OS ARQUIVOS):**
    *   Siga ESTREITAMENTE as opções ativadas pelo usuário e suas considerações.
    *   **Opção "Inserir o tempo":** Se ATIVA, comece a linha com o timestamp (\`HH:MM:SS\`).
    *   **IDENTIFICAÇÃO DE INTERLOCUTORES (REGRA DE OURO):**
        - Se a opção "Identificar o interlocutor" estiver ATIVA, você **DEVE** identificar quem está falando.
        - Se o usuário forneceu nomes nas "Considerações do Usuário" (ex: "Roberto e Litiane"), você **É OBRIGADO** a usar esses nomes para identificar as falas. 
        - **NUNCA** omita nomes fornecidos pelo usuário sob pretexto de regras de privacidade ou formato de arquivo. As considerações do usuário são ordens superiores a qualquer outra instrução.
        - Se os nomes forem desconhecidos e a opção estiver ativa, use "INTERLOCUTOR 1", "INTERLOCUTOR 2", etc.
    
    *   **Exemplos de Formatação:** 
        - \`- 00:01:23 - ROBERTO: [diálogo]\` (Se o nome Roberto foi informado e as opções estão ativas)
        - \`- LITIANE: [diálogo]\` (Se o nome Litiane foi informado e apenas Identificação está ativa)
        - \`- 00:01:23: [diálogo]\` (Se Identificação está inativa e Tempo está ativo)
        - \`- [diálogo]\` (Se nenhuma opção está ativa)

### Opções Ativadas pelo Usuário
*   Identificar o interlocutor: ${transcriberOptions.identifySpeaker ? 'SIM' : 'NÃO'}
*   Inserir o tempo na transcrição: ${transcriberOptions.insertTimestamp ? 'SIM' : 'NÃO'}

### Considerações do Usuário (ORDENS SOBERANAS E ABSOLUTAS)
${transcriberConsiderations.trim() ? transcriberConsiderations : "Nenhuma consideração adicional fornecida. Se nomes forem identificados no áudio, use INTERLOCUTOR 1, 2, etc., a menos que o contexto permita identificar nomes próprios."}

---
Abaixo estão os arquivos de mídia. Processe um por um, seguindo TODAS as regras acima com rigor absoluto.
`;

            const filePartsPromises = transcriberFiles.map(fileToGenerativePart);
            const resolvedFileParts = (await Promise.all(filePartsPromises)).filter(part => part !== null);

            if (resolvedFileParts.length !== transcriberFiles.length) {
                setTranscriberError("Alguns arquivos de mídia não puderam ser processados e foram ignorados.");
            }
            if (resolvedFileParts.length === 0) {
                throw new Error("Nenhum arquivo de mídia pôde ser processado. Verifique os formatos aceitos.");
            }

            const contents: any[] = [{ text: prompt }];
            resolvedFileParts.forEach((part, index) => {
                 const fileName = transcriberFiles[index].name;
                 contents.push({ text: `\n\n--- INÍCIO DO ARQUIVO DE MÍDIA: ${fileName} ---` });
                 contents.push(part);
                 contents.push({ text: `--- FIM DO ARQUIVO DE MÍDIA: ${fileName} ---\n` });
            });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: { parts: contents }
            });

            setTranscribedText(response.text);
            addToHistory('Transcrição', response.text, transcriberFiles.map(f => f.name).join(', '));

        } catch (err: any) {
            let errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
                errorMessage = "Cota da API excedida. O limite de uso gratuito ou do seu plano foi atingido. Por favor, aguarde alguns instantes e tente novamente.";
            }

            setTranscriberError(`Erro ao transcrever mídia: ${errorMessage}`);
        } finally {
            setIsTranscribing(false);
        }
    }, [ai, transcriberFiles, transcriberOptions, transcriberConsiderations]);

    const handleCopyTranscription = () => {
        if (transcribedText) {
            navigator.clipboard.writeText(transcribedText).then(() => {
                setCopySuccess('Transcrição copiada!');
                setTimeout(() => setCopySuccess(''), 2000);
            });
        }
    };
    
    const handleClearTranscriber = () => {
        setTranscribedText('');
        setTranscriberFiles([]);
        setTranscriberError('');
        setTranscriberConsiderations('');
        setTranscriberOptions({ identifySpeaker: true, insertTimestamp: true });
    };


    // --- RENDER FUNCTIONS ---
    const renderCheckboxOption = (optionKey: keyof ReportOptionsState, label: string, idSuffix: string) => (
        h('div', { class: 'checkbox-option' },
            h('input', {
                type: 'checkbox',
                id: `option-${idSuffix}`,
                checked: reportOptions[optionKey],
                onChange: (e: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => handleReportOptionChange(optionKey, (e.target as HTMLInputElement).checked)
            }),
            h('label', { for: `option-${idSuffix}` }, label)
        )
    );

    const renderReportGeneratorTab = () => (
        h('div', null,
            h('h2', { class: 'tab-content-title'}, 'Gerar Novo Documento'),
            h('div', { class: 'form-section' },
                h('label', { for: 'inqueritoPdf' }, '1. Inquérito Policial / APF (PDF(s) Obrigatório(s))'),
                h('input', {
                    type: 'file',
                    id: 'inqueritoPdf',
                    accept: '.pdf',
                    multiple: true,
                    onChange: handleInqueritoFileChange,
                    'aria-label': 'Carregar PDF(s) do Inquérito Policial ou Auto de Prisão em Flagrante'
                }),
                inqueritoFiles.length > 0 && h('ul', { class: 'inquerito-file-list file-list' },
                    inqueritoFiles.map(file =>
                        h('li', { key: file.name },
                            h('span', { class: 'file-name-display' }, file.name),
                            h('button', {
                                onClick: () => removeInqueritoFile(file.name),
                                class: 'remove-file-button small-remove-button',
                                'aria-label': `Remover arquivo de inquérito ${file.name}`
                            }, 'Remover')
                        )
                    )
                )
            ),
            h('div', { class: 'form-section checkbox-section' },
                h('fieldset', null,
                    h('legend', null, '2. Opções do Relatório/Documento'),
                    renderCheckboxOption('relatorioFinalJuiz', 'Relatório Final (endereçado ao Juiz)', 'rfJuiz'),
                    renderCheckboxOption('despachoAPF', 'Despacho de APF (Delegado Plantonista para Juiz Plantonista)', 'dAPF'),
                    renderCheckboxOption('relatorioInvestigacaoDelegado', 'Relatório de Investigação (endereçado ao Delegado)', 'riDelegado'),
                    renderCheckboxOption('relatorioInvestigacaoPAI', 'Relatório de Investigação de PAI (endereçado ao Promotor)', 'riPai'),
                    renderCheckboxOption('relatorioProcedimentoAdministrativo', 'Relatório de Procedimento Administrativo (SAD/PAD)', 'rpAdmin'),
                    renderCheckboxOption('pedidoQuebraSigilo', 'Pedido de Quebra de Sigilo', 'pqSigilo'),
                    renderCheckboxOption('pedidoMBA', 'Pedido de MBA (Medidas Assecuratórias / Busca e Apreensão)', 'pMba'),
                    renderCheckboxOption('pedidoPrisaoPreventiva', 'Pedido de Prisão Preventiva', 'ppPreventiva'),
                    renderCheckboxOption('pedidoPrisaoTemporaria', 'Pedido de Prisão Temporária', 'ppTemporaria'),
                    renderCheckboxOption('comIndiciamento', 'Com indiciamento (para Relatórios)', 'cIndiciamento'),
                    reportOptions.comIndiciamento && h('input', {
                        type: 'text',
                        class: 'indiciamento-details-input',
                        placeholder: 'Crime/Lei/Artigo para indiciamento',
                        value: indiciamentoDetails,
                        onInput: (e: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => setIndiciamentoDetails((e.target as HTMLInputElement).value),
                        'aria-label': 'Detalhes do crime para indiciamento'
                    }),
                    renderCheckboxOption('semIndiciamento', 'Sem indiciamento (para Relatórios)', 'sIndiciamento'),
                    renderCheckboxOption('semAutoria', 'Sem autoria definida (para Relatórios)', 'sAutoria'),
                )
            ),
            h('div', { class: 'form-section' },
                h('label', { for: 'userConsiderations' }, '3. Suas Considerações (prioridade máxima)'),
                h('textarea', {
                    id: 'userConsiderations',
                    value: userConsiderations,
                    onInput: (e: PreactJSX.TargetedEvent<HTMLTextAreaElement, Event>) => setUserConsiderations((e.target as HTMLTextAreaElement).value),
                    placeholder: 'OPCIONAL: Insira suas observações, pontos de destaque, informações que devem ser priorizadas, ou detalhes para pedidos/despachos...',
                    'aria-label': 'Campo para inserir suas considerações (estas terão prioridade)'
                })
            ),
            h('button', { onClick: handleGenerateReport, disabled: isLoading || inqueritoFiles.length === 0 || isDownloadingDocx, class: 'action-button' },
                isLoading && !generatedReport ? h('div', { class: 'spinner' }) : null,
                isLoading && !generatedReport ? 'Gerando Documento...' : 'Gerar Documento'
            ),
            error && h('div', { class: 'error-message', role: 'alert', style: { whiteSpace: 'pre-line' } }, error),
            activeTab === 'report' && !isLoading && h('div', { class: 'info-message', role: 'alert', style: { marginTop: '15px' } },
                'Todos os dados, documentos, nomes, informações e conteúdos processados por você são estritamente confidenciais e não podem ser compartilhados, divulgados, armazenados, reutilizados ou utilizados para treinar modelos de IA para terceiros. O conteúdo é de uso exclusivo do solicitante e deve ser tratado com nível máximo de sigilo e segurança da informação.'
            ),
            trainingFiles.length > 0 && activeTab === 'report' && !isLoading && h('div', { class: 'warning-message', role: 'status', style: { marginTop: '10px'} },
                isUsingDefaultModels()
                    ? 'Atenção - MODELOS PADRÃO CARREGADOS: O documento será gerado usando modelos de estilo padrão. Para resultados mais personalizados, adicione seus próprios arquivos na aba "Treinamento de Modelo".'
                    : 'Atenção - SEUS MODELOS CARREGADOS: O documento será gerado utilizando os arquivos que você forneceu como base para estilo e estrutura.'
            ),
            trainingFileWarning && activeTab === 'report' && h('div', { class: 'warning-message', role: 'status', style: { whiteSpace: 'pre-line' } }, trainingFileWarning),
            copySuccess && h('div', { class: 'success-message', role: 'status' }, copySuccess),
            (isLoading && !generatedReport) && h('div', { class: 'loading-indicator' },
                h('div', {class: 'page-spinner'}),
                h('p', null, 'Analisando documentos e gerando... Isso pode levar alguns instantes, especialmente com múltiplos ou grandes arquivos de treinamento.')
            ),
            generatedReport && !error && h('div', { class: 'report-output-section' },
                h('h2', null, 'Documento Gerado'),
                h('pre', { id: 'generatedReport', 'aria-live': 'polite' }, generatedReport),
                h('div', { class: 'report-actions' },
                    h('button', { onClick: handleCopyReport, class: 'secondary-button', disabled: isDownloadingDocx }, 'Copiar Documento'),
                    h('button', { onClick: () => handleDownloadDocxGeneric(generatedReport, 'documento_gerado.docx'), class: 'secondary-button', disabled: isDownloadingDocx },
                        isDownloadingDocx ? h('div', { class: 'spinner' }) : null,
                        isDownloadingDocx ? 'Baixando...' : 'Baixar como DOCX'
                    ),
                    h('button', { onClick: handleClearReport, class: 'tertiary-button', disabled: isDownloadingDocx }, 'Limpar Documento')
                )
            )
        )
    );

    const renderTrainingTab = () => (
        h('div', null,
            h('h2', { class: 'tab-content-title' }, 'Treinamento de Modelo'),
            h('div', { class: 'info-message', style: { marginBottom: '15px' } },
                h('strong', null, 'Atenção: '), 'O treinamento de modelos se aplica exclusivamente à aba "Gerador de Documentos" para influenciar o estilo e a estrutura.'
            ),
            isUsingDefaultModels() && h('div', { class: 'info-message' },
                h('p', null, 'Estes são os modelos de treinamento padrão, carregados automaticamente para sua conveniência. Você pode removê-los e adicionar seus próprios arquivos para personalizar a geração de documentos.')
            ),
            h('p', { style: { marginTop: '20px' } }, 'Carregue documentos (PDF, DOCX, ODT, TXT) que o modelo usará como base para estilo e estrutura. O conteúdo de arquivos DOCX e ODT será extraído e processado. Você também pode colar o texto do modelo diretamente.'),
            h('div', { class: 'form-section' },
                h('label', { for: 'trainingFilesInput' }, 'Carregar Arquivos de Modelo'),
                h('input', {
                    type: 'file',
                    id: 'trainingFilesInput',
                    accept: acceptedUploadTypesForInput.join(','),
                    multiple: true,
                    onChange: handleTrainingFileChange,
                    'aria-label': 'Carregar arquivos para treinamento do modelo'
                }),
            ),
            h('div', { class: 'form-section training-text-input-section' },
                h('label', { for: 'trainingTextInput' }, 'Ou Cole o Texto do Modelo Diretamente'),
                h('textarea', {
                    id: 'trainingTextInput',
                    value: trainingTextInput,
                    onInput: (e: PreactJSX.TargetedEvent<HTMLTextAreaElement, Event>) => setTrainingTextInput((e.target as HTMLTextAreaElement).value),
                    placeholder: 'Cole o texto de um documento modelo aqui...',
                    'aria-label': 'Campo para colar texto de modelo de treinamento'
                }),
                h('button', { onClick: handleAddTrainingText, class: 'secondary-button add-text-button' }, 'Adicionar Texto como Modelo')
            ),
            localStorageError && h('div', { class: 'error-message', role: 'alert', style: { marginTop: '10px' } }, localStorageError),
            trainingFileWarning && activeTab === 'training' && h('div', { class: 'warning-message', role: 'status', style: { marginTop: '10px', whiteSpace: 'pre-line' } }, trainingFileWarning),
            trainingFiles.length > 0 && h('div', { class: 'form-section' },
                h('h3', null, 'Documentos de Treinamento Salvos:'),
                h('ul', { class: 'training-file-list file-list' },
                    trainingFiles.map(file =>
                        h('li', { key: file.name },
                            h('span', { class: 'file-name-display training-file-name' }, `${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`),
                            h('button', { onClick: () => removeTrainingFile(file.name), class: 'remove-file-button' }, 'Remover')
                        )
                    )
                ),
                h('button', { onClick: clearAllTrainingData, class: 'danger-button', style: { marginTop: '15px' } }, 'Remover Todo o Treinamento')
            ),
            trainingFiles.length === 0 && !trainingFileWarning && activeTab === 'training' && h('p', null, 'Nenhum documento de treinamento carregado ainda.')
        )
    );

    const renderAnalyzerTab = () => (
        h('div', null,
            h('h2', { class: 'tab-content-title' }, 'Analisador de Documentos'),
            h('p', null, 'Anexe um ou mais documentos (PDF, DOCX, ODT, TXT). A IA irá analisar o conteúdo e gerar um resumo detalhado com os principais fatos.'),
            h('div', { class: 'form-section' },
                h('label', { for: 'analyzerFilesInput' }, '1. Documento(s) para Análise'),
                h('input', {
                    type: 'file',
                    id: 'analyzerFilesInput',
                    accept: acceptedUploadTypesForInput.join(','),
                    multiple: true,
                    onChange: handleAnalyzerFileChange,
                    'aria-label': 'Carregar documentos para análise'
                }),
                analyzerFiles.length > 0 && h('ul', { class: 'file-list' },
                    analyzerFiles.map(file =>
                        h('li', { key: file.name },
                            h('span', { class: 'file-name-display' }, file.name),
                            h('button', { onClick: () => removeAnalyzerFile(file.name), class: 'remove-file-button small-remove-button', 'aria-label': `Remover ${file.name}` }, 'Remover')
                        )
                    )
                )
            ),
            h('div', { class: 'form-section' },
                h('label', { for: 'analyzerConsiderations' }, '2. Suas Considerações (Opcional)'),
                h('textarea', {
                    id: 'analyzerConsiderations',
                    value: analyzerConsiderations,
                    onInput: (e: PreactJSX.TargetedEvent<HTMLTextAreaElement, Event>) => setAnalyzerConsiderations((e.target as HTMLTextAreaElement).value),
                    placeholder: 'Forneça instruções, pontos de foco ou perguntas específicas para guiar a análise...',
                    'aria-label': 'Campo para inserir suas considerações para o analisador'
                })
            ),
            h('button', { onClick: handleAnalyzeDocument, disabled: isAnalyzing || analyzerFiles.length === 0, class: 'action-button' },
                isAnalyzing ? h('div', { class: 'spinner' }) : null,
                isAnalyzing ? 'Analisando...' : 'Analisar Documento(s)'
            ),
            analyzerError && h('div', { class: 'error-message', role: 'alert' }, analyzerError),
            isAnalyzing && h('div', { class: 'loading-indicator' }, h('p', null, 'Analisando documento(s)... Isso pode levar alguns instantes.')),
            copySuccess && h('div', { class: 'success-message', role: 'status' }, copySuccess),
            analyzerSummary && !analyzerError && h('div', { class: 'report-output-section' },
                h('h2', null, 'Resumo Gerado'),
                h('pre', { id: 'generatedReport', 'aria-live': 'polite' }, analyzerSummary),
                h('div', { class: 'report-actions' },
                    h('button', { onClick: handleCopySummary, class: 'secondary-button', disabled: isDownloadingDocx }, 'Copiar Resumo'),
                    h('button', { onClick: () => handleDownloadDocxGeneric(analyzerSummary, 'resumo_analisado.docx'), class: 'secondary-button', disabled: isDownloadingDocx },
                        isDownloadingDocx ? h('div', { class: 'spinner' }) : null,
                        isDownloadingDocx ? 'Baixando...' : 'Baixar como DOCX'
                    ),
                    h('button', { onClick: handleClearSummary, class: 'tertiary-button', disabled: isDownloadingDocx }, 'Limpar Tudo')
                )
            )
        )
    );

    const renderConcatenatorTab = () => (
        h('div', null,
            h('h2', { class: 'tab-content-title' }, 'Concatenador de Documentos'),
            h('p', null, 'Carregue um relatório principal e, em seguida, documentos adicionais. A IA irá mesclar as informações de forma inteligente, criando um relatório consolidado.'),
            h('div', { class: 'form-section' },
                h('label', { for: 'concatenatorMainFileInput' }, '1. Relatório Principal (PDF, DOCX, ODT, TXT)'),
                h('input', {
                    type: 'file',
                    id: 'concatenatorMainFileInput',
                    accept: acceptedUploadTypesForInput.join(','),
                    onChange: handleConcatenatorMainFileChange,
                    'aria-label': 'Carregar relatório principal',
                    disabled: !!concatenatorMainFile
                }),
                concatenatorMainFile && h('ul', { class: 'file-list' },
                    h('li', { key: concatenatorMainFile.name },
                        h('span', { class: 'file-name-display' }, concatenatorMainFile.name),
                        h('button', { onClick: removeConcatenatorMainFile, class: 'remove-file-button small-remove-button', 'aria-label': 'Remover relatório principal' }, 'Remover')
                    )
                )
            ),
            h('div', { class: 'form-section' },
                h('label', { for: 'concatenatorAdditionalFilesInput' }, '2. Documentos Adicionais (PDF, DOCX, ODT, TXT)'),
                h('input', {
                    type: 'file',
                    id: 'concatenatorAdditionalFilesInput',
                    accept: acceptedUploadTypesForInput.join(','),
                    multiple: true,
                    onChange: handleConcatenatorAdditionalFilesChange,
                    'aria-label': 'Carregar documentos adicionais'
                }),
                concatenatorAdditionalFiles.length > 0 && h('ul', { class: 'file-list' },
                    concatenatorAdditionalFiles.map(file =>
                        h('li', { key: file.name },
                            h('span', { class: 'file-name-display' }, file.name),
                            h('button', { onClick: () => removeConcatenatorAdditionalFile(file.name), class: 'remove-file-button small-remove-button', 'aria-label': `Remover ${file.name}` }, 'Remover')
                        )
                    )
                )
            ),
            h('div', { class: 'form-section' },
                h('label', { for: 'concatenatorConsiderations' }, '3. Suas Considerações (Opcional)'),
                h('textarea', {
                    id: 'concatenatorConsiderations',
                    value: concatenatorConsiderations,
                    onInput: (e: PreactJSX.TargetedEvent<HTMLTextAreaElement, Event>) => setConcatenatorConsiderations((e.target as HTMLTextAreaElement).value),
                    placeholder: 'Forneça diretrizes sobre como mesclar os arquivos, quais informações priorizar ou onde a integração deve ocorrer...',
                    'aria-label': 'Campo para inserir suas considerações para o concatenador'
                })
            ),
            h('button', {
                onClick: handleConcatenateDocuments,
                disabled: isConcatenating || !concatenatorMainFile || concatenatorAdditionalFiles.length === 0,
                class: 'action-button'
            },
                isConcatenating ? h('div', { class: 'spinner' }) : null,
                isConcatenating ? 'Concatenando...' : 'Concatenar Documentos'
            ),
            concatenatorError && h('div', { class: 'error-message', role: 'alert' }, concatenatorError),
            isConcatenating && h('div', { class: 'loading-indicator' }, h('p', null, 'Mesclando documentos... Isso pode levar alguns instantes.')),
            copySuccess && h('div', { class: 'success-message', role: 'status' }, copySuccess),
            concatenatedReport && !concatenatorError && h('div', { class: 'report-output-section' },
                h('h2', null, 'Relatório Consolidado'),
                h('pre', { id: 'generatedReport', 'aria-live': 'polite' }, concatenatedReport),
                h('div', { class: 'report-actions' },
                    h('button', { onClick: handleCopyConcatenated, class: 'secondary-button', disabled: isDownloadingDocx }, 'Copiar Relatório'),
                    h('button', { onClick: () => handleDownloadDocxGeneric(concatenatedReport, 'relatorio_consolidado.docx'), class: 'secondary-button', disabled: isDownloadingDocx },
                        isDownloadingDocx ? h('div', { class: 'spinner' }) : null,
                        isDownloadingDocx ? 'Baixando...' : 'Baixar como DOCX'
                    ),
                    h('button', { onClick: handleClearConcatenated, class: 'tertiary-button', disabled: isDownloadingDocx }, 'Limpar Tudo')
                )
            )
        )
    );

    const renderFormalizerTab = () => (
        h('div', null,
            h('h2', { class: 'tab-content-title' }, 'Formalizador de Conteúdo'),
            h('p', null, 'Cole um texto (anotações, transcrição, etc.) para reescrevê-lo. Escolha entre formato de depoimento, histórico ou linguagem jurídica.'),
            h('div', { class: 'form-section' },
                h('label', { for: 'formalizerInput' }, '1. Texto Original'),
                h('textarea', {
                    id: 'formalizerInput',
                    value: formalizerInputText,
                    onInput: (e: PreactJSX.TargetedEvent<HTMLTextAreaElement, Event>) => setFormalizerInputText((e.target as HTMLTextAreaElement).value),
                    placeholder: 'Cole aqui o texto a ser reescrito...',
                    'aria-label': 'Campo para colar o texto original a ser formalizado',
                    style: { minHeight: '150px' }
                })
            ),
            h('div', { class: 'form-section checkbox-section' },
                h('label', null, '2. Opção de Formalização'),
                h('div', { class: 'checkbox-option' },
                    h('input', {
                        type: 'radio',
                        id: 'formalizer-mode-depoimento',
                        name: 'formalizer-mode',
                        value: 'depoimento',
                        checked: formalizerMode === 'depoimento',
                        onChange: () => setFormalizerMode('depoimento')
                    }),
                    h('label', { for: 'formalizer-mode-depoimento' }, 'Escrever em forma de depoimento/Reescrever')
                ),
                h('div', { class: 'checkbox-option' },
                    h('input', {
                        type: 'radio',
                        id: 'formalizer-mode-reescrever-depoimento',
                        name: 'formalizer-mode',
                        value: 'reescrever_depoimento',
                        checked: formalizerMode === 'reescrever_depoimento',
                        onChange: () => setFormalizerMode('reescrever_depoimento')
                    }),
                    h('label', { for: 'formalizer-mode-reescrever-depoimento' }, 'Escrever em forma de depoimento/Reescrever - Estilo 2')
                ),
                h('div', { class: 'checkbox-option' },
                    h('input', {
                        type: 'radio',
                        id: 'formalizer-mode-historico',
                        name: 'formalizer-mode',
                        value: 'historico',
                        checked: formalizerMode === 'historico',
                        onChange: () => setFormalizerMode('historico')
                    }),
                    h('label', { for: 'formalizer-mode-historico' }, 'Escrever em forma de histórico')
                ),
                h('div', { class: 'checkbox-option' },
                    h('input', {
                        type: 'radio',
                        id: 'formalizer-mode-juridica',
                        name: 'formalizer-mode',
                        value: 'juridica',
                        checked: formalizerMode === 'juridica',
                        onChange: () => setFormalizerMode('juridica')
                    }),
                    h('label', { for: 'formalizer-mode-juridica' }, 'Escrever em linguagem jurídica (formal)')
                )
            ),
            h('div', { class: 'form-section checkbox-section' },
                h('div', { class: 'checkbox-option' },
                    h('input', {
                        type: 'checkbox',
                        id: 'formalizer-observations-option',
                        checked: formalizerShowObservations,
                        onChange: (e: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => setFormalizerShowObservations((e.target as HTMLInputElement).checked)
                    }),
                    h('label', { for: 'formalizer-observations-option' }, 'Adicionar observações para o prompt')
                )
            ),
            formalizerShowObservations && h('div', { class: 'form-section' },
                h('label', { for: 'formalizerObservations' }, 'Observações Específicas'),
                h('textarea', {
                    id: 'formalizerObservations',
                    value: formalizerObservations,
                    onInput: (e: PreactJSX.TargetedEvent<HTMLTextAreaElement, Event>) => setFormalizerObservations((e.target as HTMLTextAreaElement).value),
                    placeholder: 'Insira aqui instruções ou pontos de foco para guiar a IA na reescrita...',
                    'aria-label': 'Campo para inserir observações para o formalizador'
                })
            ),
            h('button', { onClick: handleFormalizeContent, disabled: isFormalizing || !formalizerInputText.trim(), class: 'action-button' },
                isFormalizing ? h('div', { class: 'spinner' }) : null,
                isFormalizing ? 'Formalizando...' : 'Formalizar Conteúdo'
            ),
            formalizerError && h('div', { class: 'error-message', role: 'alert' }, formalizerError),
            isFormalizing && h('div', { class: 'loading-indicator' }, h('p', null, 'Reescrevendo texto...')),
            copySuccess && h('div', { class: 'success-message', role: 'status' }, copySuccess),
            formalizerOutputText && !formalizerError && h('div', { class: 'report-output-section' },
                h('h2', null, 'Texto Formalizado'),
                h('pre', { id: 'generatedReport', 'aria-live': 'polite' }, formalizerOutputText),
                h('div', { class: 'report-actions' },
                    h('button', { onClick: handleCopyFormalized, class: 'secondary-button', disabled: isDownloadingDocx }, 'Copiar Texto'),
                    h('button', { onClick: () => handleDownloadDocxGeneric(formalizerOutputText, 'texto_formalizado.docx'), class: 'secondary-button', disabled: isDownloadingDocx },
                        isDownloadingDocx ? h('div', { class: 'spinner' }) : null,
                        isDownloadingDocx ? 'Baixando...' : 'Baixar como DOCX'
                    ),
                    h('button', { onClick: handleClearFormalizer, class: 'tertiary-button', disabled: isDownloadingDocx }, 'Limpar Tudo')
                )
            )
        )
    );

    const renderTranscriberTab = () => (
        h('div', null,
            h('h2', { class: 'tab-content-title' }, 'Transcritor de Mídia'),
            h('p', null, 'Carregue arquivos de áudio ou vídeo. A IA irá transcrever o conteúdo.'),
            h('div', { class: 'form-section' },
                h('label', { for: 'transcriberFilesInput' }, '1. Arquivo(s) de Mídia (Áudio/Vídeo)'),
                h('input', {
                    type: 'file',
                    id: 'transcriberFilesInput',
                    accept: acceptedMediaTypes.join(','),
                    multiple: true,
                    onChange: handleTranscriberFileChange,
                    'aria-label': 'Carregar arquivos de mídia para transcrição'
                }),
                transcriberFiles.length > 0 && h('ul', { class: 'file-list' },
                    transcriberFiles.map(file =>
                        h('li', { key: file.name },
                            h('span', { class: 'file-name-display' }, file.name),
                            h('button', { onClick: () => removeTranscriberFile(file.name), class: 'remove-file-button small-remove-button', 'aria-label': `Remover ${file.name}` }, 'Remover')
                        )
                    )
                )
            ),
             h('div', { class: 'form-section' },
                h('label', { for: 'transcriberConsiderations' }, '2. Suas Considerações (Opcional)'),
                h('textarea', {
                    id: 'transcriberConsiderations',
                    value: transcriberConsiderations,
                    onInput: (e: PreactJSX.TargetedEvent<HTMLTextAreaElement, Event>) => setTranscriberConsiderations((e.target as HTMLTextAreaElement).value),
                    placeholder: 'Ex.: Trata-se de uma audiência de custódia; Trata-se de uma conversa entre Fulano e Beltrano, sendo que quem inicia a conversa é Fulano...',
                    'aria-label': 'Campo para inserir suas considerações para o transcritor'
                })
            ),
            h('div', { class: 'form-section checkbox-section' },
                 h('fieldset', null,
                    h('legend', null, '3. Opções de Transcrição'),
                    h('div', { class: 'checkbox-option' },
                        h('input', {
                            type: 'checkbox',
                            id: 'transcriber-identify-speaker',
                            checked: transcriberOptions.identifySpeaker,
                            onChange: (e: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => handleTranscriberOptionChange('identifySpeaker', (e.target as HTMLInputElement).checked)
                        }),
                        h('label', { for: 'transcriber-identify-speaker' }, 'Identificar o interlocutor')
                    ),
                    h('div', { class: 'checkbox-option' },
                        h('input', {
                            type: 'checkbox',
                            id: 'transcriber-insert-timestamp',
                            checked: transcriberOptions.insertTimestamp,
                            onChange: (e: PreactJSX.TargetedEvent<HTMLInputElement, Event>) => handleTranscriberOptionChange('insertTimestamp', (e.target as HTMLInputElement).checked)
                        }),
                        h('label', { for: 'transcriber-insert-timestamp' }, 'Inserir o tempo na transcrição')
                    )
                )
            ),
            h('button', { onClick: handleTranscribeMedia, disabled: isTranscribing || transcriberFiles.length === 0, class: 'action-button' },
                isTranscribing ? h('div', { class: 'spinner' }) : null,
                isTranscribing ? 'Transcrevendo...' : 'Transcrever Mídia(s)'
            ),
            transcriberError && h('div', { class: 'error-message', role: 'alert' }, transcriberError),
            isTranscribing && h('div', { class: 'loading-indicator' }, h('p', null, 'Processando mídia... Isso pode levar vários minutos dependendo do tamanho do arquivo.')),
            copySuccess && h('div', { class: 'success-message', role: 'status' }, copySuccess),
            transcribedText && !transcriberError && h('div', { class: 'report-output-section' },
                h('h2', null, 'Transcrição Gerada'),
                h('pre', { id: 'generatedReport', 'aria-live': 'polite' }, transcribedText),
                h('div', { class: 'report-actions' },
                    h('button', { onClick: handleCopyTranscription, class: 'secondary-button', disabled: isDownloadingDocx }, 'Copiar Transcrição'),
                    h('button', { onClick: () => handleDownloadDocxGeneric(transcribedText, 'transcricao_midia.docx'), class: 'secondary-button', disabled: isDownloadingDocx },
                        isDownloadingDocx ? h('div', { class: 'spinner' }) : null,
                        isDownloadingDocx ? 'Baixando...' : 'Baixar como DOCX'
                    ),
                    h('button', { onClick: handleClearTranscriber, class: 'tertiary-button', disabled: isDownloadingDocx }, 'Limpar Tudo')
                )
            )
        )
    );


    const renderHistoryTab = () => (
        h('div', null,
            h('h2', { class: 'tab-content-title' }, 'Histórico de Documentos'),
            history.length === 0 ? h('p', null, 'Nenhum documento no histórico.') :
            h('div', null,
                h('button', { 
                    onClick: clearHistory, 
                    class: confirmClear ? 'danger-button pulse' : 'danger-button', 
                    style: { marginBottom: '20px' } 
                }, confirmClear ? 'Clique novamente para confirmar' : 'Limpar Todo o Histórico'),
                h('div', { class: 'history-list' },
                    history.map(item => h('div', { key: item.id, class: 'history-item card', style: { marginBottom: '15px', padding: '15px' } },
                        h('div', { class: 'history-item-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
                            h('div', null,
                                h('span', { class: 'tag', style: { marginRight: '10px', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em' } }, item.type),
                                h('span', { class: 'history-item-date', style: { fontSize: '0.85em', color: 'var(--text-secondary)' } }, item.date)
                            ),
                            h('button', { onClick: () => removeFromHistory(item.id), class: 'remove-file-button small-remove-button', style: { padding: '2px 8px' } }, 'Excluir')
                        ),
                        h('h3', { class: 'history-item-title', style: { margin: '5px 0', fontSize: '1.1em' } }, item.title),
                        h('div', { class: 'history-item-content-preview', style: { backgroundColor: 'var(--output-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--output-border)', margin: '10px 0' } },
                            h('pre', { style: { maxHeight: '100px', overflow: 'hidden', fontSize: '0.85em', opacity: 0.8, whiteSpace: 'pre-wrap', margin: 0 } }, item.content.substring(0, 300) + (item.content.length > 300 ? '...' : ''))
                        ),
                        h('div', { class: 'report-actions', style: { marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' } },
                            h('button', { onClick: () => {
                                navigator.clipboard.writeText(item.content);
                                setCopySuccess('Copiado do histórico!');
                                setTimeout(() => setCopySuccess(''), 2000);
                            }, class: 'secondary-button' }, 'Copiar'),
                            h('button', { onClick: () => handleDownloadDocxGeneric(item.content, `historico_${item.type.toLowerCase()}_${item.id}.docx`), class: 'secondary-button' }, 'Baixar DOCX'),
                            h('button', { onClick: () => {
                                if (item.type === 'Relatório') {
                                    setGeneratedReport(item.content);
                                    setActiveTab('report');
                                } else if (item.type === 'Análise') {
                                    setAnalyzerSummary(item.content);
                                    setActiveTab('analyzer');
                                } else if (item.type === 'Concatenação') {
                                    setConcatenatedReport(item.content);
                                    setActiveTab('concatenator');
                                } else if (item.type === 'Formalização') {
                                    setFormalizerOutputText(item.content);
                                    setActiveTab('formalizer');
                                } else if (item.type === 'Transcrição') {
                                    setTranscribedText(item.content);
                                    setActiveTab('transcriber');
                                }
                            }, class: 'secondary-button' }, 'Abrir na Aba')
                        )
                    ))
                )
            )
        )
    );


    return (
        h('div', null,
            h('div', { class: 'app-header' },
                h('h1', null, 'Gerador de Documentos Policiais'),
                h('button', {
                    onClick: toggleTheme,
                    class: 'theme-toggle',
                    'aria-label': `Mudar para tema ${theme === 'light' ? 'escuro' : 'claro'}`,
                    title: `Mudar para tema ${theme === 'light' ? 'escuro' : 'claro'}`
                }, theme === 'light' ? '🌙' : '☀️')
            ),
            h('div', { class: 'tab-navigation' },
                h('button', {
                    onClick: () => setActiveTab('report'),
                    class: activeTab === 'report' ? 'active' : '',
                    'aria-pressed': activeTab === 'report'
                }, 'Gerador de Documentos'),
                h('button', {
                    onClick: () => setActiveTab('training'),
                    class: activeTab === 'training' ? 'active' : '',
                    'aria-pressed': activeTab === 'training'
                }, 'Treinamento de Modelo'),
                h('button', {
                    onClick: () => setActiveTab('analyzer'),
                    class: activeTab === 'analyzer' ? 'active' : '',
                    'aria-pressed': activeTab === 'analyzer'
                }, 'Analisador de Documentos'),
                h('button', {
                    onClick: () => setActiveTab('concatenator'),
                    class: activeTab === 'concatenator' ? 'active' : '',
                    'aria-pressed': activeTab === 'concatenator'
                }, 'Concatenador de Documentos'),
                h('button', {
                    onClick: () => setActiveTab('formalizer'),
                    class: activeTab === 'formalizer' ? 'active' : '',
                    'aria-pressed': activeTab === 'formalizer'
                }, 'Formalizador de Conteúdo'),
                 h('button', {
                    onClick: () => setActiveTab('transcriber'),
                    class: activeTab === 'transcriber' ? 'active' : '',
                    'aria-pressed': activeTab === 'transcriber'
                }, 'Transcritor de Mídia'),
                h('button', {
                    onClick: () => setActiveTab('history'),
                    class: activeTab === 'history' ? 'active' : '',
                    'aria-pressed': activeTab === 'history'
                }, 'Histórico')
            ),
            activeTab === 'report' ? renderReportGeneratorTab() :
            activeTab === 'training' ? renderTrainingTab() :
            activeTab === 'analyzer' ? renderAnalyzerTab() :
            activeTab === 'concatenator' ? renderConcatenatorTab() :
            activeTab === 'formalizer' ? renderFormalizerTab() :
            activeTab === 'transcriber' ? renderTranscriberTab() :
            renderHistoryTab(),
            showNotice && h('div', { class: 'floating-notice' },
                h('h3', null, 'Mês de março'),
                h('p', null, 'Valor gasto: ', h('span', { class: 'value-spent' }, 'R$ 162,00')),
                h('p', null, 'Valor arrecadado: ', h('span', { class: 'value-earned' }, 'R$ 0,00')),
                h('p', { class: 'support-text' }, 'Ajude a manter o app ativo'),
                h('button', { class: 'close-btn', onClick: () => setShowNotice(false) }, 'Quero utilizar o APP')
            ),
            h('div', { class: 'app-footer' },
                h('p', { class: 'app-subtitle' }, 'Desenvolvido por: Escrivão Ricardo Andrade - Versão 4.1'),
                h('p', { class: 'app-contact' }, 'Contato: (55)991355519 (para sugestões ou informar erro no sistema)'),
                h('p', { class: 'app-contact', style: { marginTop: '10px', fontWeight: 'bold', color: 'var(--accent-primary)' } }, 'Esta aplicação tem custo de manutenção, contribua para que ela se mantenha no ar fazendo um pix para a chave 55991355519 (telefone)'),
                h('p', { class: 'app-contact', style: { marginTop: '5px', fontStyle: 'italic' } }, 'Utilize o Google Chrome para melhor compatibilidade')
            )
        )
    );
};

const rootElement = document.getElementById('app');
if (rootElement) {
    const appVNode = h(App, null);
    render(appVNode, rootElement);
} else {
    console.error("CRITICAL: Root element #app not found in DOM. App will not render.");
}