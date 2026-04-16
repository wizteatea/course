// Devine la catégorie d'un aliment à partir de son nom.
// Renvoie l'une des CATEGORIES connues, ou 'Autres' si rien ne matche.

const KEYWORDS = {
  'Fruits et légumes': [
    'pomme', 'poire', 'banane', 'orange', 'citron', 'clémentine', 'mandarine', 'pamplemousse',
    'fraise', 'framboise', 'myrtille', 'mûre', 'cassis', 'groseille', 'cerise', 'abricot',
    'pêche', 'nectarine', 'prune', 'raisin', 'kiwi', 'ananas', 'mangue', 'papaye', 'figue',
    'melon', 'pastèque', 'avocat', 'grenade', 'litchi', 'datte',
    'tomate', 'carotte', 'courgette', 'aubergine', 'poivron', 'concombre', 'salade', 'laitue',
    'roquette', 'épinard', 'chou', 'brocoli', 'chou-fleur', 'haricot', 'petit pois', 'pois',
    'pomme de terre', 'patate', 'oignon', 'ail', 'échalote', 'poireau', 'céleri', 'fenouil',
    'radis', 'navet', 'betterave', 'courge', 'potiron', 'citrouille', 'artichaut', 'asperge',
    'champignon', 'maïs', 'lentille', 'fève', 'endive', 'blette', 'cresson', 'mâche',
    'persil', 'basilic', 'coriandre', 'menthe', 'ciboulette', 'thym', 'romarin', 'aneth',
    'estragon', 'gingembre', 'piment', 'légume', 'fruit', 'herbe',
  ],
  'Viande': [
    'poulet', 'dinde', 'canard', 'pintade', 'lapin', 'oie',
    'boeuf', 'bœuf', 'veau', 'porc', 'agneau', 'mouton', 'cheval',
    'steak', 'escalope', 'côte', 'côtelette', 'filet', 'rôti', 'rosbif', 'entrecôte',
    'jambon', 'saucisse', 'saucisson', 'chorizo', 'lardon', 'bacon', 'pancetta', 'salami',
    'merguez', 'chipolata', 'boudin', 'pâté', 'rillette', 'terrine', 'charcuterie',
    'viande', 'haché', 'magret', 'cuisse', 'aile', 'blanc de poulet',
  ],
  'Poisson': [
    'saumon', 'thon', 'cabillaud', 'morue', 'lieu', 'colin', 'merlu', 'sole', 'dorade',
    'bar', 'loup', 'truite', 'sardine', 'maquereau', 'hareng', 'anchois', 'espadon',
    'raie', 'turbot', 'lotte', 'rouget', 'églefin', 'haddock',
    'crevette', 'gambas', 'langoustine', 'homard', 'crabe', 'tourteau', 'écrevisse',
    'moule', 'huître', 'coquille', 'saint-jacques', 'coquillage', 'bulot', 'bigorneau',
    'calamar', 'encornet', 'poulpe', 'seiche', 'surimi',
    'poisson', 'fruits de mer',
  ],
  'Produits laitiers': [
    'lait', 'yaourt', 'yogourt', 'fromage blanc', 'faisselle', 'skyr', 'fromage', 'beurre',
    'crème', 'crème fraîche', 'mascarpone', 'ricotta', 'mozzarella', 'parmesan', 'gruyère',
    'emmental', 'comté', 'camembert', 'brie', 'roquefort', 'chèvre', 'feta', 'cheddar',
    'raclette', 'reblochon', 'munster', 'oeuf', 'œuf', 'œufs', 'oeufs',
  ],
  'Boulangerie': [
    'pain', 'baguette', 'brioche', 'croissant', 'pain au chocolat', 'viennoiserie',
    'biscotte', 'pain de mie', 'pita', 'tortilla', 'wrap', 'naan', 'fougasse', 'focaccia',
  ],
  'Surgelés': [
    'surgelé', 'glace', 'sorbet', 'crème glacée', 'frites surgelées',
  ],
  'Boissons': [
    'eau', 'jus', 'soda', 'coca', 'limonade', 'thé', 'café', 'infusion', 'tisane',
    'vin', 'bière', 'cidre', 'champagne', 'rhum', 'whisky', 'vodka', 'gin', 'pastis',
    'sirop', 'boisson', 'smoothie',
  ],
  'Épicerie': [
    'riz', 'pâtes', 'pate', 'spaghetti', 'tagliatelle', 'penne', 'fusilli', 'macaroni',
    'semoule', 'boulgour', 'quinoa', 'couscous', 'farine', 'sucre', 'sel', 'poivre',
    'épice', 'huile', 'vinaigre', 'moutarde', 'mayonnaise', 'ketchup', 'sauce',
    'conserve', 'bocal', 'miel', 'confiture', 'pâte à tartiner', 'nutella', 'chocolat',
    'cacao', 'biscuit', 'gâteau', 'céréale', 'muesli', 'granola', 'flocon',
    'noix', 'noisette', 'amande', 'cacahuète', 'pistache', 'pignon', 'graine',
    'bouillon', 'levure', 'fécule', 'maïzena', 'tapioca', 'chapelure',
    'olive', 'cornichon', 'câpre', 'tomate pelée', 'concentré',
  ],
};

// Trie pour que les mots-clés longs/spécifiques soient testés en premier.
const FLAT = Object.entries(KEYWORDS)
  .flatMap(([cat, words]) => words.map(w => ({ word: w.toLowerCase(), cat })))
  .sort((a, b) => b.word.length - a.word.length);

export function guessCategory(name) {
  if (!name) return 'Autres';
  const n = name.toLowerCase().trim();
  if (!n) return 'Autres';
  for (const { word, cat } of FLAT) {
    // match mot entier ou sous-chaîne pour gérer pluriels / variantes
    if (n === word || n.includes(word)) return cat;
  }
  return 'Autres';
}
