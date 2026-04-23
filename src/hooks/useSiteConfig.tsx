import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Home Hero Section
export interface HomeHeroConfig {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  badge_text: string;
  bg_image_mobile: string | null;
  bg_image_desktop: string | null;
  // Carrossel de imagens mobile
  mobile_carousel_images?: string[];
  mobile_carousel_interval?: number; // em segundos
}

// Home Intro Section (O que é UAIROX?)
export interface HomeIntroConfig {
  title: string;
  text: string;
  card_1_title: string;
  card_1_desc: string;
  card_2_title: string;
  card_2_desc: string;
  card_3_title: string;
  card_3_desc: string;
  section_image: string | null;
}

// Home Journey Section (A Jornada)
export interface HomeJourneyConfig {
  title: string;
  description: string;
  highlight_text: string;
  section_image: string | null;
  button_text?: string;
  button_link?: string;
}

// Home Final CTA Section
export interface HomeCtaFinalConfig {
  title: string;
  button_text: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_link?: string;
  bg_image: string | null;
}

// Challenges Page Config
export interface ChallengesPageHeroConfig {
  badge_text: string;
  title: string;
  subtitle: string;
  bg_image_mobile: string | null;
  bg_image_desktop: string | null;
}

export interface ChallengesPageAboutConfig {
  title: string;
  description: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  section_image: string | null;
}

export interface ChallengesPageHowItWorksConfig {
  title: string;
  steps: Array<{
    number: string;
    title: string;
    description: string;
  }>;
}

export interface ChallengesPageCtaConfig {
  title: string;
  description: string;
}

export interface ChallengesPageConfig {
  hero: ChallengesPageHeroConfig;
  about: ChallengesPageAboutConfig;
  how_it_works: ChallengesPageHowItWorksConfig;
  cta: ChallengesPageCtaConfig;
}

// NOVO UAIROX - Landing Page Config
export interface HomeHeroNewConfig {
  badge_text: string;
  title_top: string;
  title_highlight: string;
  subtitle: string;
  description: string;
  cta_primary_text: string;
  cta_primary_link: string;
  background_images?: string[];
}

export interface StationConfig {
  id: number;
  name: string;
  metric: string;
  muscle: string;
  rules_link?: string;
  desc: string;
  image_url?: string;
}

export interface RaceTypeConfig {
  id: string;
  name: string;
  banner_text?: string;
  stations: StationConfig[];
}

export interface HomeFormatNewConfig {
  title_prefix: string;
  title_highlight: string;
  description: string;
  stations: StationConfig[]; // Legado, fallback
  race_types?: RaceTypeConfig[];
}

export interface HomeEventItem {
  id: string;
  badge_text: string;
  is_badge_active: boolean;
  city: string;
  date_label: string;
  description: string;
  btn_text: string;
  btn_link: string;
  is_disabled: boolean;
  opacity: number;
  bg_acronym: string;
}

export interface HomeEventsNewConfig {
  title_prefix: string;
  title_highlight: string;
  description: string;
  season_label: string;
  experience_title?: string;
  experience_description?: string;
  oficial_title?: string;
  oficial_description?: string;
  events: HomeEventItem[];
}

export interface HomeExperienceNewConfig {
  badge_text: string;
  title_top: string;
  title_highlight: string;
  description: string;
  btn_primary_text: string;
  btn_primary_link: string;
  btn_secondary_text: string;
  btn_secondary_link: string;
  images?: string[];
}

export interface HomePredictorNewConfig {
  badge_text: string;
  title_top: string;
  title_highlight: string;
  description: string;
}

export interface HomeFooterConfig {
  description: string;
  ig_link: string;
  yt_link: string;
  copyright: string;
}

export interface HomeStatsNewConfig {
  val_1: string; label_1: string;
  val_2: string; label_2: string;
  val_3: string; label_3: string;
  val_4: string; label_4: string;
}

export interface HomeSponsorConfig {
  id: string;
  name: string;
  logo_url: string;
  link?: string;
}

export interface HomeSponsorsNewConfig {
  title: string;
  sponsors: HomeSponsorConfig[];
}

export interface SquadPageConfig {
  badge_text: string;
  title: string;
  description: string;
  cta_button_text: string;
  benefits_title: string;
  benefits_subtitle: string;
  tier_bronze_label: string;
  tier_bronze_desc: string;
  tier_prata_label: string;
  tier_prata_desc: string;
  tier_ouro_label: string;
  tier_ouro_desc: string;
  tier_elite_label: string;
  tier_elite_desc: string;
}



export interface ExperiencePageConfig {
  hero: {
    title_top: string;
    title_highlight: string;
    description: string;
    bg_image: string | null;
  };
  objective: {
    title: string;
    subtitle: string;
    image_url?: string | null;
    items: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  format: {
    title: string;
    subtitle: string;
    stations: Array<{
      name: string;
      metric: string;
    }>;
  };
  pricing: {
    title: string;
    default_price: string;
    includes: string;
    excludes: string;
    optional: string;
    image_url?: string | null;
  };
  business_model: {
    title: string;
    description: string;
    tiers: Array<{
      label: string;
      description: string;
    }>;
  };
  branding: {
    title: string;
    rules: Array<{
      title: string;
      description: string;
      is_prohibited: boolean;
    }>;
  };
  responsibilities: {
    title: string;
    uairox_tasks: string[];
    box_tasks: string[];
    image_url?: string | null;
  };
  gallery: {
    title: string;
    images: string[];
  };
  cta: {
    title: string;
    description: string;
    button_text: string;
    button_link: string;
  };
}

// Legacy configs (for backwards compatibility)
interface HeroConfig {
  title: string;
  subtitle: string;
  cta_text: string;
  background_url: string | null;
}

interface FeaturedEventConfig {
  event_id: string | null;
}

interface SectionsConfig {
  show_gallery: boolean;
  show_results: boolean;
  show_sponsors: boolean;
}

interface SponsorsConfig {
  logos: string[];
}

// WhatsApp Support Config
export interface WhatsAppSupportConfig {
  enabled: boolean;
  whatsapp_link: string;
}

export interface SiteConfig {
  hero: HeroConfig;
  featured_event: FeaturedEventConfig;
  sections: SectionsConfig;
  sponsors: SponsorsConfig;
  home_hero: HomeHeroConfig;
  home_intro: HomeIntroConfig;
  home_journey: HomeJourneyConfig;
  home_cta_final: HomeCtaFinalConfig;
  challenges_page: ChallengesPageConfig;
  whatsapp_support: WhatsAppSupportConfig;
  home_hero_new: HomeHeroNewConfig;
  home_format_new: HomeFormatNewConfig;
  home_events_new: HomeEventsNewConfig;
  home_experience_new: HomeExperienceNewConfig;
  home_stats_new: HomeStatsNewConfig;
  home_predictor_new?: HomePredictorNewConfig;
  home_footer?: HomeFooterConfig;
  squad_page?: SquadPageConfig;
  experience_page?: ExperiencePageConfig;
  home_sponsors_new?: HomeSponsorsNewConfig;
}

const defaultConfig: SiteConfig = {
  hero: {
    title: "UAIROX",
    subtitle: "A competição de corrida com obstáculos mais desafiadora do Brasil",
    cta_text: "Próximos Eventos",
    background_url: null,
  },
  featured_event: {
    event_id: null,
  },
  sections: {
    show_gallery: true,
    show_results: true,
    show_sponsors: true,
  },
  sponsors: {
    logos: [],
  },
  home_hero: {
    title: "Supere Seus Limites",
    subtitle: "A maior competição de fitness híbrido do Brasil. 8 estações. 1 objetivo. Descobrir do que você é capaz.",
    cta_text: "Próximos Eventos",
    badge_text: "Temporada 2025",
    bg_image_mobile: null,
    bg_image_desktop: null,
    mobile_carousel_images: [],
    mobile_carousel_interval: 5,
  },
  home_intro: {
    title: "O Que É UAIROX?",
    text: "Uma competição de corrida com obstáculos que combina corrida, força e mente em 8 estações desafiadoras.",
    card_1_title: "Corrida",
    card_1_desc: "Percursos dinâmicos que testam sua resistência e velocidade.",
    card_2_title: "Força",
    card_2_desc: "Obstáculos que exigem força funcional e explosão muscular.",
    card_3_title: "Mente",
    card_3_desc: "Desafios que testam sua capacidade de foco sob pressão.",
    section_image: null,
  },
  home_journey: {
    title: "A Jornada",
    description: "Conecte seu Strava, complete desafios semanais e ganhe recompensas. Sua evolução começa antes do evento.",
    highlight_text: "Integração com Strava",
    section_image: null,
  },
  home_cta_final: {
    title: "Pronto Para o Desafio?",
    button_text: "Criar Conta",
    bg_image: null,
  },
  challenges_page: {
    hero: {
      badge_text: "Trilhas de Desafios",
      title: "Sua Jornada de Evolução",
      subtitle: "Complete desafios progressivos, ganhe recompensas exclusivas e evolua como atleta. Conecte-se com uma comunidade de atletas dedicados.",
      bg_image_mobile: null,
      bg_image_desktop: null,
    },
    about: {
      title: "O Que São as Trilhas?",
      description: "As Trilhas de Desafios são programas estruturados que te guiam em uma jornada de evolução contínua. Cada trilha possui uma série de desafios progressivos que te ajudam a desenvolver habilidades específicas.",
      features: [
        { icon: "route", title: "Progressão Guiada", description: "Desafios organizados do básico ao avançado" },
        { icon: "trophy", title: "Recompensas Exclusivas", description: "Badges, medalhas e prêmios a cada conquista" },
        { icon: "users", title: "Comunidade", description: "Conecte-se com outros atletas na mesma jornada" },
      ],
      section_image: null,
    },
    how_it_works: {
      title: "Como Funciona",
      steps: [
        { number: "01", title: "Escolha Sua Trilha", description: "Selecione a trilha que melhor se alinha aos seus objetivos" },
        { number: "02", title: "Complete os Desafios", description: "Avance pelos desafios, validando suas conquistas" },
        { number: "03", title: "Ganhe Recompensas", description: "Receba badges, descontos e prêmios exclusivos" },
      ],
    },
    cta: {
      title: "Escolha Sua Trilha",
      description: "Selecione uma das trilhas abaixo e comece sua jornada de evolução hoje mesmo.",
    },
  },
  whatsapp_support: {
    enabled: true,
    whatsapp_link: "https://wa.me/5531999999999",
  },
  home_sponsors_new: {
    title: "PARCEIROS E PATROCINADORES",
    sponsors: []
  },
  home_hero_new: {
    badge_text: "A Corrida Fitness Para Todos",
    title_top: "8x1KM",
    title_highlight: "CORRIDA",
    subtitle: "+ 8 WORKOUTS",
    description: "Combine corrida de média distância com treinos funcionais de alta intensidade. O formato é sempre o mesmo. O seu limite, você quem define.",
    cta_primary_text: "Próximos Eventos",
    cta_primary_link: "#etapas",
    background_images: [],
  },
  home_format_new: {
    title_prefix: "O",
    title_highlight: "Formato",
    description: "A corrida híbrida segue um padrão rigoroso. Você começa com 1km de corrida, seguido de um workout funcional, e repete esse ciclo 8 vezes.",
    stations: [
      { id: 1, name: 'SkiErg', metric: '1000m', muscle: 'Costas, Core, Tríceps', desc: 'A prova começa no simulador de esqui. Requer potência de membros superiores e forte engajamento do core. O desafio inicial de cardio.' },
      { id: 2, name: 'Sled Push', metric: '50m', muscle: 'Quadríceps, Panturrilha', desc: 'Empurre o trenó pesado por 50 metros (geralmente 4x 12.5m). Uma queima severa nas pernas logo após a segunda corrida.' },
      { id: 3, name: 'Sled Pull', metric: '50m', muscle: 'Costas, Bíceps, Posterior', desc: 'Puxe o trenó com uma corda. Exige aderência forte e potência na cadeia posterior. O peso varia conforme a categoria.' },
      { id: 4, name: 'Burpee Broad Jumps', metric: '80m', muscle: 'Corpo Inteiro', desc: 'O destruidor de pulmões. Um burpee completo seguido de um salto em distância. Cobre 80 metros totais na arena.' },
      { id: 5, name: 'Rowing', metric: '1000m', muscle: 'Pernas, Costas, Cardio', desc: 'Remo indoor. O meio da prova exige estabilidade mental e uma técnica eficiente para recuperar as pernas.' },
      { id: 6, name: 'Farmers Carry', metric: '200m', muscle: 'Antebraço, Trapézio, Core', desc: 'Caminhada de fazendeiro carregando kettlebells pesados. O desafio aqui é a força de pegada (grip) após as estações anteriores.' },
      { id: 7, name: 'Sandbag Lunges', metric: '100m', muscle: 'Quadríceps, Glúteos', desc: 'Avanços carregando um sandbag nas costas. A fadiga acumulada nas pernas atinge o pico nesta penúltima estação.' },
      { id: 8, name: 'Wall Balls', metric: '75 - 100 Reps', muscle: 'Ombros, Pernas, Cardio', desc: 'O final épico. Agachamento com arremesso de bola na parede. Você tem que lutar contra a vontade de parar até a última repetição.' }
    ],
    race_types: []
  },
  home_events_new: {
    title_prefix: "Próximas",
    title_highlight: "Etapas",
    description: "O circuito está montado. Escolha sua arena, convoque sua dupla ou encare o desafio individualmente.",
    season_label: "Temporada 2026",
    events: [
      { id: "1", bg_acronym: "BTM", badge_text: "Lote 2 Aberto", is_badge_active: true, city: "Betim, MG", date_label: "16 - 18 Abril, 2026", description: "A etapa de abertura do circuito. Arena completa com 15.000m², pista indoor e climatizada.", btn_text: "Garantir Vaga", btn_link: "#", is_disabled: false, opacity: 100 },
      { id: "2", bg_acronym: "BHZ", badge_text: "Pré-Venda", is_badge_active: false, city: "Belo Horizonte", date_label: "10 - 12 Agosto, 2026", description: "O desafio chega à capital mineira. Prepare-se para uma arena montada no coração de BH.", btn_text: "Lista VIP", btn_link: "#", is_disabled: false, opacity: 100 },
      { id: "3", bg_acronym: "UDI", badge_text: "Em Breve", is_badge_active: false, city: "Uberlândia", date_label: "Novembro, 2026", description: "Fechando o circuito no triângulo mineiro. Detalhes serão anunciados em breve.", btn_text: "Aguarde", btn_link: "#", is_disabled: true, opacity: 70 }
    ]
  },
  home_experience_new: {
    badge_text: "Para Box & Academias",
    title_top: "UAIROX",
    title_highlight: "EXPERIENCE",
    description: "Leve uma simulação da prova oficial para o seu box, academia ou centro de treinamento e proporcione um dia épico de superação para sua comunidade.",
    btn_primary_text: "Saber Mais",
    btn_primary_link: "/experience",
    btn_secondary_text: "Falar com Consultor",
    btn_secondary_link: "mailto:contato@uairox.com.br",
  },
  home_stats_new: {
    val_1: "8.0", label_1: "KM Total de Corrida",
    val_2: "8", label_2: "Estações Funcionais",
    val_3: "1200", label_3: "ATLETAS PARTICIPANTES",
    val_4: "95%", label_4: "SATISFAÇÃO",
  },
  home_predictor_new: {
    badge_text: 'Desafio Estratégico',
    title_top: 'UAIROX',
    title_highlight: 'Predictor',
    description: 'Simule o seu tempo de prova. Os cálculos adaptam-se automaticamente à distância e exigência de cada formato.'
  },
  home_footer: {
    description: 'Desenhado para atletas de endurance. Prepare-se para a corrida híbrida definitiva de Minas Gerais.',
    ig_link: '#',
    yt_link: '#',
    copyright: '© 2026 UAIROX Hybrid Racing. Todos os direitos reservados.'
  },
  squad_page: {
    badge_text: "Embaixadores Oficiais",
    title: "O Motor do UAIROX",
    description: "Conheça os Coaches, Atletas e Influencers que movimentam a nossa comunidade. O SQUAD é o nosso programa de recompensas para quem ajuda o esporte a crescer.",
    cta_button_text: "Quero fazer parte do Squad",
    benefits_title: "Benefícios & Níveis",
    benefits_subtitle: "Como funciona a mecânica do programa",
    tier_bronze_label: "Bronze",
    tier_bronze_desc: "Acesso VIP + Descontos em Loja.",
    tier_prata_label: "Prata",
    tier_prata_desc: "Isenção de inscrição em 1 evento.",
    tier_ouro_label: "Ouro",
    tier_ouro_desc: "Kits exclusivos e Isenção Total.",
    tier_elite_label: "Elite",
    tier_elite_desc: "Patrocínio Oficial UAIROX e Vagas.",
  },
  experience_page: {
    hero: {
      title_top: "UAIROX",
      title_highlight: "EXPERIENCE",
      description: "Uma imersão desenhada para levar a cultura das corridas fitness híbridas para dentro da sua comunidade. É uma ferramenta estratégica para gerar engajamento, atrair novos alunos e proporcionar uma vivência real de evento para o seu negócio.",
      bg_image: null,
    },
    objective: {
      title: "OBJETIVO E CARÁTER",
      subtitle: "Qual o propósito do Experience?",
      image_url: null,
      items: [
        { title: "Experiência Real", description: "Realizar uma simulação reduzida da prova oficial UAIROX, gerando o desejo de treinar para competições oficiais e usufruir dos benefícios do treinamento híbrido.", icon: "target" },
        { title: "Não Competitivo", description: "O evento é estritamente inclusivo e participativo. Não possui caráter competitivo. O foco é a superação individual e o espírito de comunidade. Por este motivo, não haverá pódios, medalhas ou bandeiras de premiação.", icon: "heart" },
      ]
    },
    format: {
      title: "FORMATO E PROVA",
      subtitle: "As simulações ocorrem sempre em DUPLAS (Masculinas, Femininas ou Mistas). O DESAFIO:",
      stations: [
        { name: "RUN 400 mts + UAIZONE 1", metric: "800 mts SKIERG" },
        { name: "RUN 400 mts + UAIZONE 2", metric: "SLED PUSH (50m)" },
        { name: "RUN 400 mts + UAIZONE 3", metric: "SLED PULL (50m)" },
        { name: "RUN 400 mts + UAIZONE 4", metric: "BURPEE BROAD JUMP (80m)" },
        { name: "RUN 400 mts + UAIZONE 5", metric: "ROWERG (800 mts)" },
        { name: "RUN 400 mts + UAIZONE 6", metric: "FARMER CARRY (200 mts)" },
        { name: "RUN 400 mts + UAIZONE 7", metric: "SANDBAG LUNGES (100m)" },
        { name: "RUN 400 mts + UAIZONE 8", metric: "WALL BALLS (80 reps)" },
      ]
    },
    pricing: {
      title: "INSCRIÇÕES E VALORES",
      default_price: "R$ 120,00 por dupla",
      includes: "Participação no evento e acesso à estrutura UAIROX.",
      excludes: "Não há kits, brindes, medalhas ou camisetas inclusos no valor base.",
      optional: "Opcional 'UAIROX Finisher': O box pode optar por incluir a pulseira oficial de participação. Isso gera um acréscimo de R$ 10,00 por atleta (R$ 20,00 por dupla) no valor da inscrição.",
      image_url: null
    },
    business_model: {
      title: "MODELO DE NEGÓCIO",
      description: "O modelo de parceria visa cobrir os custos operacionais e bonificar o Box/CT pelo engajamento:",
      tiers: [
        { label: "De 01 a 25 Inscrições", description: "Receita integral da UAIROX (para cobertura de custos logísticos, equipe e sistema)." },
        { label: "De 26 Inscrições em diante", description: "Receita integral do Box / CT." }
      ]
    },
    branding: {
      title: "CAMISAS E BRANDING",
      rules: [
        { title: "Regra Obrigatória", description: "A arte deve conter a logomarca da UAIROX como realizadora.", is_prohibited: false },
        { title: "Proibição", description: "É terminantemente proibido o uso da marca ou nome 'HYROX' em qualquer material, por questões de direitos de imagem e controle de marca.", is_prohibited: true },
      ]
    },
    responsibilities: {
      title: "RESPONSABILIDADES",
      uairox_tasks: [
        "Disponibilizar a plataforma para inscrições e recebimento de valores.",
        "Organização geral da prova e alinhamento de regras/padrões no grupo de atletas.",
        "Fornecer equipamentos específicos (que o box não possua).",
        "Fornecer o Sistema de Arbitragem Eletrônica. (Obs: Não haverá Judges nas estações, reforçando o caráter não competitivo).",
        "Toda a estrutura de sinalização e marketing visual do evento.",
        "Divulgação nas redes sociais oficiais da UAIROX."
      ],
      box_tasks: [
        "Cessão do espaço físico e equipamentos já disponíveis na unidade.",
        "Garantir a limpeza do espaço antes e após o evento.",
        "Divulgação ativa entre seus alunos (canais internos e redes sociais do box)."
      ],
      image_url: null
    },
    gallery: {
      title: "VIVENCIE O EXPERIENCE",
      images: []
    },
    cta: {
      title: "Pronto para levar a UAIROX para o seu Box?",
      description: "Fale com nosso time de parceiros e descubra como agendar o evento na sua unidade.",
      button_text: "Falar com Consultor",
      button_link: "mailto:contato@uairox.com.br"
    }
  }
};

export function useSiteConfig() {
  return useQuery({
    queryKey: ["site-config"],
    queryFn: async (): Promise<SiteConfig> => {
      const { data, error } = await supabase
        .from("site_config")
        .select("key, value");

      if (error) throw error;

      const config = { ...defaultConfig };
      
      data?.forEach((row) => {
        const key = row.key as keyof SiteConfig;
        if (key in config) {
          config[key] = row.value as any;
        }
      });

      return config;
    },
  });
}

export function useUpdateSiteConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // First try to update
      const { data: existing } = await supabase
        .from("site_config")
        .select("id")
        .eq("key", key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("site_config")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key);
        if (error) throw error;
      } else {
        // Insert if doesn't exist
        const { error } = await supabase
          .from("site_config")
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
      toast.success("Configuração atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configuração: " + error.message);
    },
  });
}

export function useUploadSiteAsset() {
  return useMutation({
    mutationFn: async ({ file, path }: { file: File; path: string }) => {
      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    },
    onError: (error) => {
      toast.error("Erro ao fazer upload: " + error.message);
    },
  });
}
