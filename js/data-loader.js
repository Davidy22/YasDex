const PokedexData = {
    pokemon: null,
    pokemonList: [],
    pokemonMap: new Map(),
    types: null,
    typeMap: new Map(),
    abilities: null,
    abilityMap: new Map(),
    moves: null,
    movesMap: new Map(),
    eggGroups: null,
    eggGroupsMap: new Map(),
    versionGroups: null,
    loading: false,
    error: null,
    
    typeColors: {
        normal: { bg: 'bg-gray-500', text: 'text-white' },
        fire: { bg: 'bg-red-500', text: 'text-white' },
        water: { bg: 'bg-blue-500', text: 'text-white' },
        electric: { bg: 'bg-yellow-500', text: 'text-white' },
        grass: { bg: 'bg-green-500', text: 'text-white' },
        ice: { bg: 'bg-blue-200', text: 'text-gray-800' },
        fighting: { bg: 'bg-red-800', text: 'text-white' },
        poison: { bg: 'bg-purple-500', text: 'text-white' },
        ground: { bg: 'bg-yellow-600', text: 'text-white' },
        flying: { bg: 'bg-indigo-300', text: 'text-gray-800' },
        psychic: { bg: 'bg-pink-500', text: 'text-white' },
        bug: { bg: 'bg-green-600', text: 'text-white' },
        rock: { bg: 'bg-yellow-800', text: 'text-white' },
        ghost: { bg: 'bg-purple-800', text: 'text-white' },
        dragon: { bg: 'bg-indigo-700', text: 'text-white' },
        dark: { bg: 'bg-gray-800', text: 'text-white' },
        steel: { bg: 'bg-gray-400', text: 'text-gray-800' },
        fairy: { bg: 'bg-pink-300', text: 'text-gray-800' }
    },

    async loadAll() {
        this.loading = true;
        try {
            const [pokemonRes, typesRes, abilitiesRes, movesRes, versionsRes, eggGroupsRes] = await Promise.all([
                fetch('data/pokemon.json'),
                fetch('data/types.json'),
                fetch('data/abilities.json'),
                fetch('data/moves.json'),
                fetch('data/version-groups.json'),
                fetch('data/egg-groups.json')
            ]);

            this.pokemon = await pokemonRes.json();
            this.types = await typesRes.json();
            this.abilities = await abilitiesRes.json();
            this.moves = await movesRes.json();
            this.versionGroups = await versionsRes.json();
            this.eggGroups = await eggGroupsRes.json();
            this.pokemonList = Object.values(this.pokemon);

            this.pokemonList.forEach(p => {
                this.pokemonMap.set(p.id, p);
                p.details = p;
            });
            this.moves.forEach(m => this.movesMap.set(m.id, m));
            this.eggGroupsMap = new Map(this.eggGroups.map(eg => [eg.name, eg]));

            
            return true;
        } catch (err) {
            this.error = err.message;
            console.error('❌ Error loading data:', err);
            return false;
        } finally {
            this.loading = false;
        }
    },

    getPokemonDetails(id) {
        return this.pokemon[id] || null;
    },
    
    getMoveById(moveId) {
        return this.movesMap.get(moveId);
    },
    
    getAbilityByName(name) {
        return this.abilityMap.get(name);
    },
    
    getTypeStyle(type) {
        return this.typeColors[type] || { bg: 'bg-gray-500', text: 'text-white' };
    },
    
    getPokemonById(id) {
        return this.pokemon[parseInt(id)] || null;
    },
    
    getPokemonByName(name) {
        return this.pokemonList.find(p => p.name.toLowerCase() === name.toLowerCase());
    },
    
    getPokemonByDexNumber(dex) {
        return this.pokemonList.filter(p => p.dex === dex);
    },
    
    getStatBarColor(value) {
        if (value < 50) return 'bg-red-500';
        if (value < 80) return 'bg-orange-500';
        if (value < 110) return 'bg-yellow-500';
        if (value < 140) return 'bg-green-500';
        return 'bg-blue-500';
    }
};

window.PokedexData = PokedexData;
