const PokedexData = {
    pokemon: null,
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

            this.pokemon.forEach(p => this.pokemonMap.set(p.id, p));
            this.moves.forEach(m => this.movesMap.set(m.id, m));
            this.eggGroupMap = new Map(this.eggGroups.map(eg => [eg.name, eg]));

            this.preloadPokemonDetails();

            console.log(`Loaded ${this.pokemon.length} Pokémon`);
            return true;
        } catch (err) {
            this.error = err.message;
            return false;
        } finally {
            this.loading = false;
        }
    },

    async preloadPokemonDetails() {
        console.log('Background preloading Pokémon details...');

        const idsToPreload = this.pokemon
            .filter(p => !this.pokemonMap.get(p.id)?.details)
            .map(p => p.id)
            .slice(0, 100);

        // Preload in batches
        const batchSize = 10;
        for (let i = 0; i < idsToPreload.length; i += batchSize) {
            const batch = idsToPreload.slice(i, i + batchSize);
            
            // Load batch in parallel
            await Promise.all(batch.map(async id => {
                try {
                    const response = await fetch(`data/pokemon-details/${id}.json`);
                    const details = await response.json();
                    if (this.pokemonMap.has(id)) {
                        this.pokemonMap.get(id).details = details;
                    }
                } catch (err) {
                    console.warn(`Failed to preload #${id}:`, err);
                }
            }));

            await new Promise(resolve => setTimeout(resolve, 100));

            console.log(`Preloaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(idsToPreload.length/batchSize)}`);
        }

        console.log('Background preloading complete');
    },

    async getPokemonDetails(id) {
        if (this.pokemonMap.has(id)) {
            const cached = this.pokemonMap.get(id);
            if (cached.details) return cached.details;
        }
        
        try {
            const response = await fetch(`data/pokemon-details/${id}.json`);
            if (!response.ok) throw new Error(`Failed to load details for ${id}`);
            
            const details = await response.json();
            
            if (this.pokemonMap.has(id)) {
                this.pokemonMap.get(id).details = details;
            }
            
            return details;
        } catch (err) {
            console.error(`Error loading details for Pokémon ${id}:`, err);
            return null;
        }
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
        return this.pokemonMap.get(parseInt(id)) || null;
    },
    
    getPokemonByName(name) {
        return this.pokemon.find(p => p.name.toLowerCase() === name.toLowerCase());
    },
    
    getPokemonByDexNumber(dex) {
        return this.pokemon.filter(p => p.dex === dex);
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
