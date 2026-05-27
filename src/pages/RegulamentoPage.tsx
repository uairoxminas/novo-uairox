import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, BookOpen, AlertTriangle, Trophy, Dumbbell, Shield } from 'lucide-react';

function RulesTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-3 rounded border border-dark-border/50">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-brand-500/10">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 text-brand-500 font-black uppercase tracking-wider text-xs border-b border-dark-border/50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`border-b border-dark-border/30 ${ri % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
              {row.map((cell, ci) => (
                <td key={ci} className="py-2 px-3 text-zinc-300 text-xs md:text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RulesList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-brand-500 mt-0.5 flex-shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PenaltyTable({ rows }: { rows: { station: string; individual: string[]; duplas: string[] }[] }) {
  return (
    <div className="overflow-x-auto mt-3 rounded border border-dark-border/50">
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr className="bg-brand-500/10">
            <th className="text-left py-2 px-3 text-brand-500 font-black uppercase tracking-wider text-xs border-b border-dark-border/50 w-1/4">Estação</th>
            <th className="text-left py-2 px-3 text-brand-500 font-black uppercase tracking-wider text-xs border-b border-dark-border/50">Erro Individual</th>
            <th className="text-left py-2 px-3 text-brand-500 font-black uppercase tracking-wider text-xs border-b border-dark-border/50">Erro Duplas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`border-b border-dark-border/30 ${ri % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
              <td className="py-3 px-3 text-brand-500 font-bold align-top">{row.station}</td>
              <td className="py-3 px-3 text-zinc-300 align-top">
                <ul className="space-y-1">
                  {row.individual.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </td>
              <td className="py-3 px-3 text-zinc-300 align-top">
                <ul className="space-y-1">
                  {row.duplas.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Section {
  id: string;
  number: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'conceito',
    number: '1',
    title: 'Conceito',
    content: (
      <div className="space-y-3">
        <p>A UAIROX é uma competição de <strong className="text-white">Corrida Híbrida em massa</strong> realizada em ambientes fechados ou semi abertos, envolvendo uma combinação de corrida e movimentos funcionais.</p>
        <p>A UAIROX consiste em uma corrida de <strong className="text-brand-500">1 km</strong> na categoria OFICIAL ou <strong className="text-brand-500">500 mts</strong> na categoria EXPERIENCE, seguida por um exercício, repetido <strong className="text-brand-500">8 vezes</strong>.</p>
        <p>Para completar toda a corrida e receber um tempo de finalização válido, os participantes devem completar as corridas e os exercícios na ordem específica <em>(corrida, exercício, corrida, exercício, etc.)</em> até que tenham completado um total de 8 corridas e 8 exercícios.</p>
        <p>Os resultados são classificados do <strong className="text-white">tempo mais rápido para o mais lento</strong> em cada categoria respectiva.</p>
      </div>
    ),
  },
  {
    id: 'condicoes',
    number: '2',
    title: 'Condições de Participação',
    content: (
      <RulesList items={[
        'A UAIROX é uma competição aberta a todos, não sendo necessária qualificação.',
        'Ao participar do UAIROX, você concorda com a exclusão de responsabilidade e os termos da Política de Privacidade.',
        'Para participar de um evento UAIROX, o participante deve ter pelo menos 16 anos no dia da competição.',
        'Menores de 16 anos podem participar mediante termo de consentimento de pai ou responsável.',
        'Cada participante deve concordar com os termos e condições de participação.',
      ]} />
    ),
  },
  {
    id: 'registro',
    number: '3',
    title: 'Registro',
    content: (
      <div className="space-y-3">
        <p className="font-bold text-white">3.1 — Como Participar?</p>
        <p>No site <span className="text-brand-500">www.uairox.com.br</span>, o participante pode se inscrever clicando no botão "INSCRIÇÕES" para a prova específica.</p>
        <RulesList items={[
          'Selecione sua categoria',
          'Insira seus dados pessoais',
          'Agora você está registrado como um atleta',
        ]} />
      </div>
    ),
  },
  {
    id: 'categorias',
    number: '4',
    title: 'Provas e Categorias',
    content: (
      <div className="space-y-6">
        <div>
          <p className="font-black text-brand-500 uppercase tracking-widest text-xs mb-3">4.1 — Provas</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'OFICIAL', desc: '8 × 1.000 mts RUN + 8 × UAIZONES' },
              { name: 'EXPERIENCE', desc: '8 × 500 mts RUN + 8 × UAIZONES' },
              { name: 'QUARTETOS', desc: '8 × 1.000 mts RUN + 8 × UAIZONES' },
              { name: 'HERO', desc: '8 × 100 mts RUN + 8 × UAIZONES adaptados' },
            ].map(p => (
              <div key={p.name} className="border border-dark-border/50 bg-white/[0.02] p-3 rounded">
                <p className="font-black text-white text-sm">{p.name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="font-black text-brand-500 uppercase tracking-widest text-xs mb-3">4.2 — Categorias</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                prova: 'OFICIAL', cats: [
                  '1 — Individual Feminina Livre',
                  '2 — Dupla Feminina Livre',
                  '3 — Dupla Mista Livre',
                  '4 — Dupla Masculino Livre',
                  '5 — Dupla Masculino 40+',
                  '6 — Individual Masculino',
                  '7 — Individual Masculino 40+',
                ]
              },
              {
                prova: 'EXPERIENCE', cats: [
                  '8 — Individual Feminino',
                  '9 — Dupla Feminina',
                  '10 — Dupla Mista',
                  '11 — Dupla Masculino',
                  '12 — Individual Masculino',
                ]
              },
              {
                prova: 'QUARTETOS', cats: [
                  '13 — Quarteto Masculino (4 Homens)',
                  '14 — Quarteto Misto (2 Homens e 2 Mulheres)',
                ]
              },
              {
                prova: 'HERO', cats: [
                  '15 — Individual Masculino 8 a 12 anos',
                  '16 — Individual Feminino 8 a 12 anos',
                ]
              },
            ].map(g => (
              <div key={g.prova}>
                <p className="font-bold text-white text-xs uppercase tracking-widest mb-2 border-b border-dark-border/50 pb-1">Prova {g.prova}</p>
                <ul className="space-y-1">
                  {g.cats.map(c => <li key={c} className="text-zinc-400 text-xs">{c}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-zinc-500 text-xs mt-4 italic">* Em cada etapa podemos ter categorias não disponíveis.</p>
        </div>

        <div>
          <p className="font-black text-brand-500 uppercase tracking-widest text-xs mb-3">4.3 — Cargas e Repetições</p>

          <div className="space-y-4">
            <div>
              <p className="text-white font-bold text-xs mb-1">Prova OFICIAL — Masculino (cat. 3, 4, 5, 6, 7)</p>
              <RulesTable
                headers={['Movimento', 'Repetição', 'Carga']}
                rows={[
                  ['Corrida', '8× 1 km', '—'],
                  ['Skierg', '1.000 mts', 'Livre'],
                  ['Sled Push', '50 mts', '120 kg'],
                  ['Sled Pull', '50 mts', '90 kg'],
                  ['Burpee Broad Jump', '80 mts', '—'],
                  ['Row', '1.000 mts', 'Livre'],
                  ['Farmer Carry', '200 mts', '2× 24 kg'],
                  ['SandBag Lunges', '100 mts', '20 kg'],
                  ['Wall Balls', '100 reps', '14 lbs'],
                ]}
              />
            </div>
            <div>
              <p className="text-white font-bold text-xs mb-1">Prova OFICIAL — Feminino (cat. 1, 2)</p>
              <RulesTable
                headers={['Movimento', 'Repetição', 'Carga']}
                rows={[
                  ['Corrida', '8× 1 km', '—'],
                  ['Skierg', '1.000 mts', 'Livre'],
                  ['Sled Push', '50 mts', '70 kg'],
                  ['Sled Pull', '50 mts', '50 kg'],
                  ['Burpee Broad Jump', '80 mts', '—'],
                  ['Row', '1.000 mts', 'Livre'],
                  ['Farmer Carry', '200 mts', '2× 16 kg'],
                  ['SandBag Lunges', '100 mts', '10 kg'],
                  ['Wall Balls', '100 reps', '10 lbs'],
                ]}
              />
            </div>
            <div>
              <p className="text-white font-bold text-xs mb-1">Prova EXPERIENCE — Masculino / Misto (cat. 10, 11, 12)</p>
              <RulesTable
                headers={['Movimento', 'Repetição', 'Carga']}
                rows={[
                  ['Corrida', '8× 500 mts', '—'],
                  ['Skierg', '800 mts', 'Livre'],
                  ['Sled Push', '50 mts', '90 kg'],
                  ['Sled Pull', '50 mts', '70 kg'],
                  ['Burpee Broad Jump', '80 mts', '—'],
                  ['Row', '800 mts', 'Livre'],
                  ['Farmer Carry', '200 mts', '2× 24 kg'],
                  ['SandBag Lunges', '100 mts', '20 kg'],
                  ['Wall Balls', '80 reps', '14 lbs'],
                ]}
              />
            </div>
            <div>
              <p className="text-white font-bold text-xs mb-1">Prova EXPERIENCE — Feminino (cat. 8, 9)</p>
              <RulesTable
                headers={['Movimento', 'Repetição', 'Carga']}
                rows={[
                  ['Corrida', '8× 500 mts', '—'],
                  ['Skierg', '800 mts', 'Livre'],
                  ['Sled Push', '50 mts', '60 kg'],
                  ['Sled Pull', '50 mts', '40 kg'],
                  ['Burpee Broad Jump', '80 mts', '—'],
                  ['Row', '800 mts', 'Livre'],
                  ['Farmer Carry', '200 mts', '2× 16 kg'],
                  ['SandBag Lunges', '100 mts', '10 kg'],
                  ['Wall Balls', '80 reps', '10 lbs'],
                ]}
              />
            </div>
            <div>
              <p className="text-white font-bold text-xs mb-1">Prova QUARTETOS (cat. 13, 14)</p>
              <RulesTable
                headers={['Movimento', 'Repetição', 'Carga']}
                rows={[
                  ['Corrida', '8× 1 km', '—'],
                  ['Skierg', '1.000 mts', 'Livre'],
                  ['Sled Push', '50 mts', '120 kg'],
                  ['Sled Pull', '50 mts', '90 kg'],
                  ['Burpee Broad Jump', '80 mts', '—'],
                  ['Row', '1.000 mts', 'Livre'],
                  ['Farmer Carry', '200 mts', '2× 24 kg'],
                  ['SandBag Lunges', '100 mts', '20 kg'],
                  ['Wall Balls', '100 reps', '14 lbs'],
                ]}
              />
            </div>
            <div>
              <p className="text-white font-bold text-xs mb-1">Prova HERO (cat. 15, 16 — 8 a 12 anos)</p>
              <RulesTable
                headers={['Movimento', 'Repetição', 'Carga']}
                rows={[
                  ['Corrida', '8× 100 mts', '—'],
                  ['Skierg', '300 mts', 'Livre'],
                  ['Sled Push', '30 mts', 'Somente Sled'],
                  ['Sled Dragon', '30 mts', 'Somente Sled'],
                  ['Squat Broad Jump', '30 mts', '—'],
                  ['Row', '300 mts', 'Livre'],
                  ['Farmer Carry', '75 mts', '2× 4 kg'],
                  ['Walking Lunges', '30 mts', 'Sem Carga'],
                  ['Squat Balls', '50 reps', '10 lbs'],
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'desistencias',
    number: '5',
    title: 'Participação / Desistências',
    content: (
      <RulesList items={[
        'Se um membro da equipe DUPLAS ou QUARTETOS desistir, ele/ela pode ser substituído. A única exigência é que o novo membro deve ser do mesmo gênero do membro que desistiu.',
        'O atleta pode participar de 2 provas em categorias diferentes no mesmo dia ou dias, sendo uma delas em duplas ou quartetos e outra individual, mediante 2 inscrições diferentes.',
        'Caso o atleta participe de 2 provas e não esteja disponível para premiação, deverá enviar um representante ao pódio, caso seja um dos ganhadores.',
      ]} />
    ),
  },
  {
    id: 'competicao',
    number: '6',
    title: 'A Competição',
    content: (
      <div className="space-y-4">
        <p>A UAIROX consiste em corridas de <strong className="text-brand-500">1 km (Oficial/Quartetos)</strong>, <strong className="text-brand-500">500 mts (Experience)</strong> e <strong className="text-brand-500">100 mts (Hero)</strong>, seguidas por um exercício, repetidas 8 vezes.</p>

        <div>
          <p className="font-bold text-white mb-2">6.1 — Regras das Estações de Exercício</p>
          <RulesList items={[
            'Complete todos os exercícios na ordem correta.',
            'Execute cada exercício de acordo com os padrões de movimento.',
            'Use os pontos de início e término corretos da estação.',
            'Complete o número correto de repetições e/ou distâncias.',
            'Execute os movimentos com o peso correto em kg ou lbs.',
            'Nas categorias individuais, o atleta deve realizar 100% das corridas e UAIZONES.',
            'Nas categorias em duplas, os atletas sempre correm juntos e podem dividir as UAIZONES como quiser. Para começar uma UAIZONE, os dois atletas devem ter chegado da corrida.',
            'Nas categorias em Quartetos, cada atleta deve realizar 2 etapas completas de Corrida + UAIZONE (não necessariamente seguidas), até a equipe completar as 8 etapas.',
          ]} />
        </div>

        <div>
          <p className="font-bold text-white mb-2">6.2 — Corrida</p>
          <p>A distância é dividida em 1–10 voltas dependendo do local. Em alguns casos a primeira/última volta pode não ser exatamente a distância definida devido à largada escalonada — os metros faltantes serão equilibrados durante a última volta.</p>
        </div>

        <div>
          <p className="font-bold text-white mb-2">6.3 — Árbitros e Juízes Chefes</p>
          <p>Para cada exercício ou equipe, um árbitro garante que os participantes completem o exercício de forma correta e segura, em coordenação com o Juiz Chefe. <strong className="text-white">Todas as decisões do Diretor da Corrida e dos organizadores são finais.</strong></p>
        </div>
      </div>
    ),
  },
  {
    id: 'uaizones',
    number: '7',
    title: 'Padrões de Movimento — UAIZONES',
    content: (
      <div className="space-y-5">
        <p className="text-zinc-400 text-xs italic">Qualquer execução que se desvie dos padrões ou resulte em vantagem de tempo resultará em penalidade. A atribuição de faixa/equipamento é feita pelo Juiz Chefe. Penalidades são acrescidas ao tempo final sem recurso.</p>

        {[
          {
            name: 'UAIZONE 1 — SkiErg',
            rules: [
              'O monitor deve ser (re)definido por um árbitro antes de iniciar.',
              'A carga deve ser definida pelo atleta antes de iniciar (1 a 10) e não pode ser alterada pelo atleta.',
              'Os pés devem permanecer na plataforma durante todo o exercício. Levantá-los é permitido.',
              'Em duplas: colocar as manoplas no local de saída, sair da plataforma, e o parceiro inicia pegando as manoplas no próprio skierg.',
              'Soltar as manoplas de forma agressiva ou descuidada acarreta penalidade.',
              'Após completar a distância, levantar o braço para confirmar com o árbitro. Só após confirmação o atleta pode deixar a estação.',
              'Penalidade: +30 segundos por infração.',
            ],
          },
          {
            name: 'UAIZONE 2 — Sled Push',
            rules: [
              'Cada atleta é designado a uma faixa pelo juiz. É obrigatório usar a faixa designada.',
              'Tanto o trenó quanto o atleta devem estar completamente atrás da linha antes de começar.',
              'O trenó deve sempre passar completamente pela marca de fim da faixa antes de mudar de direção.',
              'O atleta deve permanecer dentro da sua faixa. Atrapalhar outros atletas gera penalidade.',
              'Apenas 1 atleta pode empurrar o trenó por vez.',
              'Em duplas, as trocas são livres; um atleta deve permanecer atrás do outro durante a execução.',
              'Penalidade: +30 segundos por infração ou 3 minutos por volta a menos.',
            ],
          },
          {
            name: 'UAIZONE 3 — Sled Pull',
            rules: [
              'Cada atleta é designado a uma faixa pelo juiz.',
              'Tanto o trenó quanto o atleta devem estar completamente atrás da linha antes de começar.',
              'O trenó deve sempre passar completamente pela marca de fim da faixa antes de mudar de direção.',
              'Haverá demarcação no final de cada faixa. Pisar na linha ou ultrapassar gera penalidade.',
              'Apenas 1 atleta pode puxar o trenó por vez.',
              'Em duplas, as trocas são livres.',
              'Penalidade: +30 segundos por infração ou 3 minutos por volta a menos.',
            ],
          },
          {
            name: 'UAIZONE 4 — Burpee Broad Jump',
            rules: [
              'O atleta deve começar completando um burpee.',
              'As mãos são colocadas atrás da linha de início (máximo um comprimento de pé). Uma vez posicionadas, não podem ser movidas para frente.',
              'Na posição inferior, o peito deve tocar claramente o chão.',
              'O atleta se levanta e salta para frente, aterrissando com os dois pés simultaneamente e paralelos.',
              'Nenhuma posição escalonada, passos ou arrastar os pés são permitidos.',
              'Dar qualquer passo para frente entre as repetições não é permitido.',
              'A estação é concluída quando o atleta salta além da linha de chegada.',
              'Em duplas, os atletas podem revezar; o parceiro espera a finalização completa da repetição para iniciar.',
              'Penalidade: +30 segundos por infração.',
            ],
          },
          {
            name: 'UAIZONE 5 — Rowerg',
            rules: [
              'O monitor do remo deve ser (re)definido por um árbitro antes de iniciar.',
              'A carga deve ser definida pelo atleta antes de iniciar (1 a 10) e não pode ser alterada pelo atleta.',
              'Os pés devem estar nos suportes antes de segurar a alça e permanecer durante todo o exercício.',
              'Em duplas: a troca não pode ter ajuda do parceiro. O atleta que sai deixa a manopla no suporte, retira os pés, e o parceiro inicia sem auxílio. Não é permitido entregar a manopla nas mãos do parceiro.',
              'Após completar a distância, levantar o braço para confirmar com o árbitro.',
              'Penalidade: +30 segundos por falta ou por metro remado a menos.',
            ],
          },
          {
            name: 'UAIZONE 6 — Farmer Carry',
            rules: [
              'O exercício começa e termina com a remoção/devolução dos kettlebells da área marcada.',
              'O atleta deve carregar ambos os kettlebells o tempo todo enquanto se move.',
              'Os kettlebells devem ser carregados com ambos os braços estendidos ao lado do atleta.',
              'Colocar no chão para descansar é permitido, desde que não avancem para frente.',
              'Em duplas, os pesos podem ser revezados, porém sempre devem ser colocados no chão para o parceiro retirar.',
              'A estação é concluída quando os kettlebells passam além da linha de chegada e são devolvidos com as alças na posição vertical.',
              'Penalidade: +30 segundos por falta ou 3 minutos por volta a menos.',
            ],
          },
          {
            name: 'UAIZONE 7 — Sandbag Lunges',
            rules: [
              'O exercício começa e termina com a remoção/devolução do saco de areia da área marcada.',
              'Individual: o atleta levanta o saco de areia sem assistência e o coloca sobre os dois ombros.',
              'Duplas: o atleta pode ter ajuda do parceiro para levantar o saco.',
              'O atleta começa em pé com os dois pés atrás da linha de início.',
              'Durante cada afundo, o joelho traseiro deve tocar claramente o chão.',
              'Cada repetição termina com joelhos e quadris totalmente estendidos.',
              'Os afundos devem ser alternados (joelhos alternados tocando o chão).',
              'Colocar o saco de areia no chão: 1ª vez +30 segundos; 2ª vez = Desqualificação.',
            ],
          },
          {
            name: 'UAIZONE 8 — WallBalls',
            rules: [
              'O atleta começa em pé segurando a bola com as duas mãos.',
              'O atleta agacha e lança a bola (com as duas mãos), atingindo o alvo correto ao se levantar — isso conta como uma repetição.',
              'Atletas femininas e masculinos têm alvos específicos no centro.',
              'Na posição inferior, os quadris devem descer abaixo dos joelhos (abaixo de 90°).',
              'Em duplas, os atletas podem trocar quando quiserem; o atleta que sai deixa a bola no chão para o parceiro iniciar.',
              'Repetição inválida: 1º aviso sem penalidade; a partir do 2º aviso, +30 segundos por repetição inválida.',
            ],
          },
        ].map(zone => (
          <div key={zone.name} className="border border-dark-border/50 rounded">
            <div className="bg-brand-500/10 px-4 py-2 border-b border-dark-border/50">
              <p className="font-black text-brand-500 text-sm uppercase tracking-wider">{zone.name}</p>
            </div>
            <div className="p-4">
              <RulesList items={zone.rules} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'penalidades-tabela',
    number: '8',
    title: 'Desvios de Padrão / Penalidades / Infrações',
    content: (
      <div className="space-y-4">
        <p className="text-zinc-400 text-xs italic">Qualquer execução que se desvie dos padrões, seja incomum ou resulte em vantagem de tempo resultará em repetição inválida ou penalidade de tempo, dependendo da estação.</p>
        <PenaltyTable rows={[
          {
            station: 'UAIZONE 1\nSkiErg',
            individual: [
              'Esquiar menos que a metragem: +30s por metro a menos',
              'Erro técnico: +30s',
            ],
            duplas: [
              'Esquiar menos que a metragem: +30s por metro a menos',
              'Erro técnico no final: +30s',
              'Erro técnico na transição: +30s',
            ],
          },
          {
            station: 'UAIZONE 2\nSled Push',
            individual: [
              'Iniciar após a linha de chegada: +30s cada vez',
              'Não passar a linha de chegada: +30s cada vez',
              'Atrapalhar atletas em outra faixa: +30s cada vez',
            ],
            duplas: [
              'Atrapalhar atletas em outra faixa: +30s cada vez',
            ],
          },
          {
            station: 'UAIZONE 3\nSled Pull',
            individual: [
              'Iniciar com pés fora da área ou pisando na linha: +30s cada vez',
              'Tocar pés na linha ou pisar fora da faixa: +30s cada vez',
              'Iniciar nova volta sem ultrapassar totalmente a linha: +30s cada vez',
              'Atrapalhar atletas em outra faixa: +30s cada vez',
            ],
            duplas: [
              'Atrapalhar atletas em outra faixa: +30s cada vez',
            ],
          },
          {
            station: 'UAIZONE 4\nBurpee Broad Jump',
            individual: [
              'Erro técnico na execução: +30s',
              'Caminhar ou dar passadas: +30s',
            ],
            duplas: [
              'Erro técnico na troca: +30s',
              'Trocar ganhando metros: +30s',
            ],
          },
          {
            station: 'UAIZONE 5\nRowerg',
            individual: [
              'Remar menos que a metragem: +30s por metro a menos',
              'Erro técnico no final (soltar manopla): +30s',
            ],
            duplas: [
              'Erro técnico na transição: +30s',
            ],
          },
          {
            station: 'UAIZONE 6\nFarmer Carry',
            individual: [
              'Erro técnico na execução: +30s',
              'Deixar kettlebell em lugar diferente ou soltar abruptamente: +30s',
            ],
            duplas: [
              'Erro técnico na transição: +30s',
            ],
          },
          {
            station: 'UAIZONE 7\nSandbag Lunges',
            individual: [
              'Não tocar joelho no chão: +30s cada vez',
              'Colocar saco de areia no chão — 1ª vez: +30s; 2ª vez: Desqualificação',
            ],
            duplas: [
              'Erro técnico na troca: +30s cada vez',
              'Colocar saco de areia no chão — 1ª vez: +30s; 2ª vez: Desqualificação',
            ],
          },
          {
            station: 'UAIZONE 8\nWall Balls',
            individual: [
              'Erro técnico no movimento: +30s em cada repetição',
              'Contagem de menos repetições: +30s por cada repetição',
            ],
            duplas: [
              'Erro técnico na transição: +30s',
            ],
          },
        ]} />
        <div className="bg-brand-500/10 border border-brand-500/20 rounded p-3 mt-3">
          <p className="text-brand-500 font-bold text-xs uppercase tracking-wider">Prova HERO</p>
          <p className="text-zinc-300 text-xs mt-1">Na Prova HERO, não há penalidades aplicadas. Os árbitros estarão sempre ajudando e auxiliando os participantes a executar os movimentos de forma correta.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'antidoping',
    number: '9',
    title: 'Política Antidoping',
    content: (
      <div className="space-y-3">
        <p>A UAIROX está comprometida em promover o jogo limpo, a integridade e o espírito de competição em todos os eventos.</p>
        <p>A UAIROX aplica uma <strong className="text-white">política antidoping de tolerância zero</strong> ao uso de substâncias ou métodos proibidos que possam comprometer a integridade da corrida.</p>
        <p>Todos os atletas que participam dos eventos do UAIROX devem cumprir as regulamentações antidoping dos organizadores.</p>
      </div>
    ),
  },
  {
    id: 'vestuario',
    number: '10',
    title: 'Vestuário, Acessórios, Hidratação e Nutrição',
    content: (
      <div className="space-y-4">
        <div>
          <p className="font-bold text-white mb-2">10.1 — Itens Permitidos</p>
          <RulesList items={['Protetor de joelho', 'Luvas', 'Cinto de levantamento de peso', 'Pulseiras']} />
        </div>
        <div>
          <p className="font-bold text-white mb-2">10.2 — Itens Proibidos</p>
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <RulesList items={['Fones de ouvido', 'Celulares', 'Óculos de realidade virtual', 'GoPro ou qualquer tipo de câmera corporal', 'Garrafinha de água durante as UAIZONES']} />
          </div>
        </div>
        <div>
          <p className="font-bold text-white mb-2">10.3 — Má Conduta Esportiva</p>
          <p>Comportamento ameaçador e/ou abusivo em relação à equipe, voluntários, espectadores ou outros competidores pode levar a penalidades e/ou desqualificação, inclusive retroativamente.</p>
        </div>
        <div>
          <p className="font-bold text-white mb-2">10.4 — Conduta Geral</p>
          <p>Jogar lixo, cuspir, limpar as narinas ou abuso de água não é permitido e pode levar a penalidades e/ou desqualificação.</p>
        </div>
        <div>
          <p className="font-bold text-white mb-2">10.5 — Hidratação e Nutrição</p>
          <p>Água estará disponível pelo menos uma vez antes ou após cada UAIZONE. Qualquer participante que desejar nutrição deve carregá-la desde o início. <strong className="text-white">Receber bebida ou nutrição de pessoas externas é considerado assistência externa e pode levar à desqualificação.</strong></p>
        </div>
      </div>
    ),
  },
  {
    id: 'cronograma',
    number: '11',
    title: 'Cronograma do Dia do Evento',
    content: (
      <div className="space-y-4">
        {[
          { title: '11.1 — Registro e Retirada do Kit', desc: 'Ao chegar, compareça à área de check-in para receber seu KIT (se houver), mediante entrega do atestado médico ou declaração de não entrega, número de início e pulseira. Traga um documento de identidade com foto e sua confirmação de registro.' },
          { title: '11.2 — Vestuários e Área de Depósito', desc: 'Vestuários e uma área de depósito de itens pessoais estarão disponíveis no local. O organizador não se responsabiliza por bagagens ou itens perdidos ou roubados.' },
          { title: '11.3 — Área de Aquecimento', desc: 'Uma área de aquecimento designada com equipamentos relevantes para a competição estará disponível para todos os participantes.' },
          { title: '11.4 — Área de Zona de Início', desc: '10 minutos antes do horário de início, os participantes devem se reunir na área da zona de início para receber instruções oficiais sobre o início da corrida.' },
        ].map(item => (
          <div key={item.title}>
            <p className="font-bold text-white mb-1">{item.title}</p>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'penalidades',
    number: '12',
    title: 'Penalidades',
    content: (
      <div className="space-y-4">
        {[
          { title: '12.1 — Voltas de Corrida Faltantes', desc: 'Penalidade de tempo de 7 minutos por volta faltante, adicionada ao tempo final.' },
          { title: '12.2 — Estações na Ordem Incorreta', desc: 'Não completar a estação de exercício na sequência correta (1–8) resulta em desqualificação automática.' },
          { title: '12.3 — Estação ou Corrida Perdida', desc: 'Perder uma estação de exercício inteira ou uma corrida de 1 km leva à desqualificação.' },
          { title: '12.4 — Confusão entre Entrada e Saída', desc: 'Cada vez que um participante entrar/sair da UAIZONE ou da CORRIDA pela porta errada, receberá penalidade de 30 segundos.' },
          { title: '12.5 — Penalidades de Tempo', desc: 'As penalidades dependem da infração e da estação. Para as estações 1–8, haverá um aviso por estação antes das penalidades serem aplicadas. Com o 2º aviso, a repetição é inválida e a penalidade é aplicada.' },
          { title: '12.6 — Não Terminou (DNF)', desc: 'Se o participante não terminar uma estação, não receberá dados de resultado e será excluído de classificações e premiações. Pode continuar a corrida sem tempo final.' },
          { title: '12.7 — Desqualificação', desc: 'Um participante desqualificado pelo Juiz Chefe não receberá dados de resultado, será excluído de classificações e premiações, e não pode continuar a corrida.' },
          { title: '12.8 — Desvios de Padrão de Movimento', desc: 'Qualquer execução que desvie dos padrões de movimento resultará em repetição inválida ou penalidade de tempo, dependendo da estação.' },
        ].map(item => (
          <div key={item.title} className="border-l-2 border-brand-500/30 pl-4">
            <p className="font-bold text-white text-sm mb-1">{item.title}</p>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'conduta',
    number: '13',
    title: 'Regras de Conduta',
    content: (
      <div className="space-y-3">
        <p>Ao se registrar, os participantes concordam em competir de maneira justa e honrosa.</p>
        <p>Má conduta esportiva — tentativas de engano, manipulação, disputas excessivas, bem como perturbar e/ou obstruir outros participantes — pode levar a:</p>
        <RulesList items={[
          'Penalidades durante a prova',
          'Desqualificação',
          'Banimento vitalício das competições do UAIROX',
          'Ação legal',
        ]} />
        <p>Qualquer participante desqualificado ou banido <strong className="text-white">não receberá reembolso</strong> por quaisquer taxas ou custos. A critério dos organizadores, qualquer uma das ações mencionadas pode ser tomada contra qualquer participante.</p>
      </div>
    ),
  },
];

function AccordionItem({ section, isOpen, onToggle }: {
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`border transition-colors ${isOpen ? 'border-brand-500/40 bg-white/[0.02]' : 'border-dark-border hover:border-brand-500/20'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4">
          <span className="text-brand-500 font-black text-base italic min-w-[24px] tabular-nums">{section.number}</span>
          <span className={`font-black uppercase tracking-widest text-sm transition-colors ${isOpen ? 'text-brand-500' : 'text-white group-hover:text-brand-500'}`}>
            {section.title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-brand-500 flex-shrink-0 ml-4"
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 pt-1 border-t border-dark-border/40 text-zinc-400 text-sm leading-relaxed">
              {section.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RegulamentoPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-500 selection:text-black">
      {/* HERO */}
      <section className="relative pt-28 pb-12 md:pt-44 md:pb-20 overflow-hidden border-b border-dark-border">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-500/3 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold uppercase tracking-widest skew-x-[-10deg] mb-6">
              <span className="block skew-x-[10deg] flex items-center gap-2">
                <BookOpen size={14} />
                Regulamento Oficial
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase italic leading-none mb-4">
              LIVRO DE <br />
              <span className="text-brand-500">REGRAS</span>
            </h1>

            <p className="text-base md:text-lg text-zinc-400 max-w-xl leading-relaxed">
              Todas as regras, padrões de movimento, categorias, penalidades e conduta da competição UAIROX Hybrid Run.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: <Trophy size={14} />, label: '16 Categorias' },
                { icon: <Dumbbell size={14} />, label: '8 UAIZONES' },
                { icon: <AlertTriangle size={14} />, label: 'Penalidades claras' },
                { icon: <Shield size={14} />, label: 'Conduta e Fair Play' },
              ].map(tag => (
                <div key={tag.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-dark-border text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  <span className="text-brand-500">{tag.icon}</span>
                  {tag.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ACCORDION */}
      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Clique em uma seção para expandir</p>
            <button
              onClick={() => setOpenId(openId ? null : SECTIONS[0].id)}
              className="text-xs text-brand-500 hover:text-white transition-colors font-bold uppercase tracking-wider"
            >
              {openId ? 'Recolher' : 'Expandir'}
            </button>
          </div>

          <motion.div
            className="space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {SECTIONS.map(section => (
              <AccordionItem
                key={section.id}
                section={section}
                isOpen={openId === section.id}
                onToggle={() => toggle(section.id)}
              />
            ))}
          </motion.div>

          <div className="mt-10 border border-dark-border/50 bg-white/[0.02] p-6 text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Dúvidas?</p>
            <p className="text-zinc-400 text-sm">Entre em contato com a organização pelo WhatsApp ou pelo Instagram <span className="text-brand-500">@uairox</span></p>
          </div>
        </div>
      </section>
    </div>
  );
}
