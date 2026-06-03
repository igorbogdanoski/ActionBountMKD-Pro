import { Quest } from 'shared';

export const DEMO_QUEST_ID = 'demo';

export const DEMO_QUEST: Quest = {
  id: DEMO_QUEST_ID,
  creatorId: 'demo',
  title: 'Демо: Тајните на Стар Прилеп',
  description: 'Кратка демонстрација на Авантура — поминете низ неколку етапи и почувствувајте како изгледа играњето на терен.',
  category: 'tourism',
  tags: ['демо', 'Прилеп', 'историја'],
  visibility: 'public',
  playMode: 'singleplayer',
  sequence: 'fixed',
  publicResults: false,
  publicLeaderboard: false,
  certificateEnabled: false,
  playingTimeMinutes: 5,
  hasIntro: true,
  hasOutro: true,
  startCoordinates: { latitude: 41.3464, longitude: 21.5536 },
  stages: [
    {
      id: 'demo-intro',
      type: 'INFO',
      title: 'Добредојде во демо авантурата!',
      description:
        'Ова е кратко демо што ти покажува како изгледа Авантура од перспектива на играч. Ќе решиш неколку загатки за стариот дел на Прилеп. Притисни „Следно“ за да започнеш.',
      order: 0,
      isIntro: true,
      mediaType: 'none',
    },
    {
      id: 'demo-quiz-1',
      type: 'QUIZ',
      title: 'Саат Кулата',
      description:
        'Саат кулата е едно од најпрепознатливите обележја на Прилеп. Во кој век е изградена според записите?',
      order: 1,
      points: 10,
      questionType: 'multiple_choice',
      options: ['XV век', 'XIX век', 'XX век', 'XVII век'],
      correctAnswer: 'XIX век',
      requiredToAdvance: false,
      hintText: 'Помеѓу 1800 и 1900 година.',
    },
    {
      id: 'demo-quiz-2',
      type: 'QUIZ',
      title: 'Чардак на висина',
      description:
        'Процени: колку метри е приближно висока Саат кулата? (внеси број во метри)',
      order: 2,
      points: 10,
      questionType: 'estimate_number',
      correctAnswer: 40,
      requiredToAdvance: false,
    },
    {
      id: 'demo-quiz-3',
      type: 'QUIZ',
      title: 'Маркуковите кули',
      description:
        'Над Прилеп се издигаат средновековните „Маркукови кули“. Со чие име народно се поврзани овие тврдини?',
      order: 3,
      points: 10,
      questionType: 'free_text',
      correctAnswer: 'Крале Марко',
      requiredToAdvance: false,
      hintText: 'Легендарен јунак од македонските народни песни.',
    },
    {
      id: 'demo-outro',
      type: 'INFO',
      title: 'Браво! Ја заврши демо авантурата 🎉',
      description:
        'Ова беше само мал дел од можностите. Со Авантура можеш да додаваш GPS точки, QR кодови, мисии со фото и видео, турнири и многу повеќе. Регистрирај се бесплатно и направи ја твојата прва авантура!',
      order: 4,
      isOutro: true,
      mediaType: 'none',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
