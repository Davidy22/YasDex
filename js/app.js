const App = {
    data() {
        return {
            filters: {
                name: '',
                selectedTypes: [],
                typeMatchMode: 'exact',
                ability: null,
                generation: null,
                isLegendary: false,
                isMythical: false,
                isBaby: false,
                isBasic: false,
                isStage1: false,
                isStage2: false,
                isFirstEvolution: false,
                isMiddleEvolution: false,
                isFinalEvolution: false,
                isOnlyEvolution: false,
                hasMultipleBranching: false,
                evolvedFromBranching: false,
                evolvedByItem: false,
                evolvedByAffection: false,
                hp: { value: null, mode: 'higher' },
                attack: { value: null, mode: 'higher' },
                defense: { value: null, mode: 'higher' },
                specialAttack: { value: null, mode: 'higher' },
                specialDefense: { value: null, mode: 'higher' },
                speed: { value: null, mode: 'higher' },
                bst: { value: null, mode: 'higher' },
                eggGroup1: null,
                eggGroup2: null,
                eggGroupMatchMode: 'any',
                moves: [
                    { name: null, method: 'any', version: null },
                    { name: null, method: 'any', version: null },
                    { name: null, method: 'any', version: null },
                    { name: null, method: 'any', version: null }
                ]
            },

            sortBy: 'dex',
            sortOrder: 'asc',

            pokemon: [],
            filteredPokemon: [],
            allPokemon: [],
            types: [],
            abilities: [],
            eggGroups: [],
            moves: [],
            versionGroups: [],
            showResults: false,

            loading: true,
            error: null,

            statModes: [
                { value: 'higher', label: '>' },
                { value: 'lower', label: '<' },
                { value: 'higherOrEqual', label: '≥' },
                { value: 'lowerOrEqual', label: '≤' },
                { value: 'equal', label: '=' }
            ],
            
            typeMatchModes: [
                { value: 'exact', label: 'Exactly selected' },
                { value: 'only', label: 'Has only selected' },
                { value: 'any', label: 'Has any selected' }
            ],

            generations: [
                { value: "generation-i", label: '1' },
                { value: "generation-ii", label: '2' },
                { value: "generation-iii", label: '3' },
                { value: "generation-iv", label: '4' },
                { value: "generation-v", label: '5' },
                { value: "generation-vi", label: '6' },
                { value: "generation-vii", label: '7' },
                { value: "generation-viii", label: '8' },
                { value: "generation-ix", label: '9' }
            ],

            moveMethods: [
                { value: 'any', label: 'Learn method' },
                { value: 'level-up', label: 'Level up' },
                { value: 'egg', label: 'Egg' },
                { value: 'tutor', label: 'Tutor' },
                { value: 'machine', label: 'TM/HM' }
            ]
        };
    },
    
    computed: {
        sortOptions() {
            return [
                { value: 'name', label: 'Name' },
                { value: 'dex', label: 'Dex Number' },
                { value: 'hp', label: 'HP' },
                { value: 'attack', label: 'Attack' },
                { value: 'defense', label: 'Defense' },
                { value: 'specialAttack', label: 'Sp. Attack' },
                { value: 'specialDefense', label: 'Sp. Defense' },
                { value: 'speed', label: 'Speed' },
                { value: 'bst', label: 'BST' },
                { value: 'height', label: 'Height' },
                { value: 'weight', label: 'Weight' },
                { value: 'type', label: 'Type' }
            ];
        },
        
        sortedAbilities() {
            return [...this.abilities].sort((a, b) => a.name.localeCompare(b.name));
        },

        sortedEggGroups() {
            return [...this.eggGroups].sort((a, b) => 
                this.formatEggGroupName(a.name).localeCompare(this.formatEggGroupName(b.name))
            );
        },

        sortedMoves() {
            return [...this.moves].sort((a, b) => a.name.localeCompare(b.name));
        }
    },
    
    async created() {
        console.log('App created, loading data...');

        try {
            const success = await PokedexData.loadAll();
            
            if (success) {
                this.types = PokedexData.types;
                this.abilities = PokedexData.abilities;
                this.moves = PokedexData.moves;
                this.versionGroups = PokedexData.versionGroups;
                this.allPokemon = PokedexData.pokemonList;
                this.pokemon = this.allPokemon;
                this.eggGroups = PokedexData.eggGroups || [];

                const savedFilters = sessionStorage.getItem('pokedexSearch_filters');
                const savedResults = sessionStorage.getItem('pokedexSearch_results');
                
                if (savedFilters && savedResults) {
                    this.filters = JSON.parse(savedFilters);
                    this.sortBy = sessionStorage.getItem('pokedexSearch_sortBy') || 'dex';
                    this.sortOrder = sessionStorage.getItem('pokedexSearch_sortOrder') || 'asc';

                    const resultIds = JSON.parse(savedResults);
                    this.filteredPokemon = resultIds
                        .map(id => this.allPokemon.find(p => p.id === id))
                        .filter(p => p);
                    
                    this.showResults = true;
                    
                    console.log('Restored previous search results');
                }
            } else {
                this.error = PokedexData.error || 'Failed to load data';
            }
        } catch (err) {
            this.error = err.message;
            console.error('Error loading data:', err);
        } finally {
            this.loading = false;
        }
    },
    
    methods: {
        formatName(name) {
            if (!name) return '';
            return name.replace(/-/g, ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },
        
        formatAbilityName(name) {
            return this.formatName(name);
        },
        
        formatMoveName(name) {
            return this.formatName(name);
        },
        
        formatEggGroupName(name) {
            return this.formatName(name);
        },
        
        toggleType(typeName) {
            const index = this.filters.selectedTypes.indexOf(typeName);
            if (index === -1) {
                this.filters.selectedTypes.push(typeName);
            } else {
                this.filters.selectedTypes.splice(index, 1);
            }
        },
        
        isTypeSelected(typeName) {
            return this.filters.selectedTypes.includes(typeName);
        },
        
        getTypeStyle(type) {
            return PokedexData.getTypeStyle(type);
        },

        clearEggGroup1() {
            this.filters.eggGroup1 = null;
        },

        clearEggGroup2() {
            this.filters.eggGroup2 = null;
        },

        isEggGroupSelected(groupName) {
            return this.filters.eggGroup1 === groupName || this.filters.eggGroup2 === groupName;
        },

        async performSearch() {
            console.log('Performing search with filters:', this.filters);

            let filtered = [...this.allPokemon];

            // Name filter
            if (this.filters.name) {
                const searchTerm = this.filters.name.toLowerCase();
                filtered = filtered.filter(p => 
                    p.name.toLowerCase().includes(searchTerm)
                );
            }

            // Type filter
            if (this.filters.selectedTypes.length > 0) {
                const mode = this.filters.typeMatchMode;
                
                filtered = filtered.filter(p => {
                    if (mode === 'any') {
                        return this.filters.selectedTypes.some(type => p.types.includes(type));
                    } else if (mode === 'only') {
                        return p.types.every(type => this.filters.selectedTypes.includes(type));
                    } else if (mode === 'exact') {
                        return p.types.every(type => this.filters.selectedTypes.includes(type)) &&
                               this.filters.selectedTypes.every(type => p.types.includes(type));
                    }
                    return true;
                });
            }

            // Egg group filters
            if (this.filters.eggGroup1 || this.filters.eggGroup2) {
                const selectedEggGroups = [this.filters.eggGroup1, this.filters.eggGroup2].filter(eg => eg);
                
                if (selectedEggGroups.length > 0) {
                    const mode = this.filters.eggGroupMatchMode || 'any';
                    
                    filtered = filtered.filter(p => {
                        const pokemonEggs = p.eggs || [];
                        
                        if (mode === 'any') {
                            return selectedEggGroups.some(eg => pokemonEggs.includes(eg));
                        } else if (mode === 'only') {
                            return pokemonEggs.every(eg => selectedEggGroups.includes(eg));
                        } else if (mode === 'exact') {
                            return selectedEggGroups.every(eg => pokemonEggs.includes(eg));
                        }
                        return true;
                    });
                }
            }

            // Ability filter
            if (this.filters.ability) {
                filtered = filtered.filter(p => p.abils.some(a => a.n === this.filters.ability));
            }

            // Generation filter
            if (this.filters.generation) {
                filtered = filtered.filter(p => p.gen === this.filters.generation);
            }

            // Legendary/Mythical filters
            if (this.filters.isLegendary) {
                filtered = filtered.filter(p => p.leg === true);
            }
            if (this.filters.isMythical) {
                filtered = filtered.filter(p => p.myth === true);
            }

            // Evolution stage filters
            if (this.filters.isBaby || this.filters.isBasic || this.filters.isStage1 || 
                this.filters.isStage2 || this.filters.isFirstEvolution || 
                this.filters.isMiddleEvolution || this.filters.isFinalEvolution || 
                this.filters.isOnlyEvolution || this.filters.hasMultipleBranching || 
                this.filters.evolvedFromBranching) {

                filtered = filtered.filter(p => {
                    const evo = p.evo || [];
                    const hasEvolutionLine = this.hasEvolutionLine(evo);
                    const position = this.getEvolutionPosition(p.name, evo);
                    const hasEvolutions = this.hasEvolutions(p.name, evo);
                    const hasPreEvolution = this.hasPreEvolution(p.name, evo);

                    if (this.filters.isBaby && !p.baby) return false;

                    if (this.filters.isBasic) {
                        if (!hasEvolutionLine || hasPreEvolution) return false;
                    }

                    if (this.filters.isStage1) {
                        if (!hasEvolutionLine || position !== 1) return false;
                    }

                    if (this.filters.isStage2) {
                        if (!hasEvolutionLine || position !== 2) return false;
                    }

                    if (this.filters.isFirstEvolution) {
                        if (!hasEvolutionLine || hasPreEvolution || !hasEvolutions) return false;
                    }

                    if (this.filters.isMiddleEvolution) {
                        if (!hasEvolutionLine || !hasPreEvolution || !hasEvolutions) return false;
                    }

                    if (this.filters.isFinalEvolution) {
                        if (!hasEvolutionLine || !hasPreEvolution || hasEvolutions) return false;
                    }

                    if (this.filters.isOnlyEvolution) {
                        if (hasEvolutionLine && (hasPreEvolution || hasEvolutions)) return false;
                    }

                    if (this.filters.hasMultipleBranching) {
                        if (!this.hasDirectBranching(evo, p.name)) return false;
                    }

                    if (this.filters.evolvedFromBranching) {
                        if (!this.evolvedFromDirectBranching(p.name, evo)) return false;
                    }
                    
                    return true;
                });
            }

            // Item evolution filter
            if (this.filters.evolvedByItem) {
                filtered = filtered.filter(p => {
                    const evo = p.evo || [];
                    const checkEvolutionNode = (node) => {
                        if (!node) return false;
                        if (node.evolves_to) {
                            for (const child of node.evolves_to) {
                                if (child.name === p.name) {
                                    return (child.item !== null || child.held_item !== null);
                                }
                                if (checkEvolutionNode(child)) return true;
                            }
                        }
                        return false;
                    };
                    return checkEvolutionNode(evo);
                });
            }

            // Affection evolution filter
            if (this.filters.evolvedByAffection) {
                filtered = filtered.filter(p => {
                    const evo = p.evo || [];
                    const checkEvolutionNode = (node) => {
                        if (!node) return false;
                        if (node.evolves_to) {
                            for (const child of node.evolves_to) {
                                if (child.name === p.name) {
                                    return (child.min_affection !== null || child.min_happiness !== null);
                                }
                                if (checkEvolutionNode(child)) return true;
                            }
                        }
                        return false;
                    };
                    return checkEvolutionNode(evo);
                });
            }

            // Stat filters
            filtered = filtered.filter(p => {
                const stats = p.stats;
                const bst = stats.hp + stats.attack + stats.defense + 
                           stats.special_attack + stats.special_defense + stats.speed;
                
                return this.compareStat(stats.hp, this.filters.hp) &&
                       this.compareStat(stats.attack, this.filters.attack) &&
                       this.compareStat(stats.defense, this.filters.defense) &&
                       this.compareStat(stats.special_attack, this.filters.specialAttack) &&
                       this.compareStat(stats.special_defense, this.filters.specialDefense) &&
                       this.compareStat(stats.speed, this.filters.speed) &&
                       this.compareStat(bst, this.filters.bst);
            });

            // Move filters
            const activeMoves = this.filters.moves.filter(m => m.name);
            if (activeMoves.length > 0) {
                filtered = filtered.filter(p => {
                    if (!p.moves) return false;
                    
                    return activeMoves.every(moveFilter => {
                        return this.pokemonHasMove(p, moveFilter);
                    });
                });
            }

            // Apply sorting
            this.filteredPokemon = this.sortPokemon(filtered, this.sortBy, this.sortOrder);
            this.showResults = true;

            // Save to session storage
            sessionStorage.setItem('pokedexSearch_filters', JSON.stringify(this.filters));
            sessionStorage.setItem('pokedexSearch_sortBy', this.sortBy);
            sessionStorage.setItem('pokedexSearch_sortOrder', this.sortOrder);
            sessionStorage.setItem('pokedexSearch_results', JSON.stringify(this.filteredPokemon.map(p => p.id)));

            console.log(`Found ${this.filteredPokemon.length} Pokémon`);
        },
        
        pokemonHasMove(pokemon, moveFilter) {
            if (!pokemon.moves) return false;

            for (const [key, moves] of Object.entries(pokemon.moves)) {
                const [method, version] = key.split('_');

                if (moveFilter.method !== 'any' && method !== moveFilter.method) {
                    continue;
                }

                if (moveFilter.version && version !== moveFilter.version) {
                    continue;
                }

                const hasMove = moves.some(m => {
                    if (Array.isArray(m)) {
                        const moveId = m[0];
                        const moveData = PokedexData.getMoveById(moveId);
                        return moveData && moveData.name === moveFilter.name;
                    } else {
                        const moveData = PokedexData.getMoveById(m);
                        return moveData && moveData.name === moveFilter.name;
                    }
                });
                
                if (hasMove) return true;
            }
            
            return false;
        },
        
        compareStat(statValue, filter) {
            if (!filter.value) return true;
            
            const mode = filter.mode || 'higher';
            const value = parseInt(filter.value);
            
            switch (mode) {
                case 'higher': return statValue > value;
                case 'lower': return statValue < value;
                case 'higherOrEqual': return statValue >= value;
                case 'lowerOrEqual': return statValue <= value;
                case 'equal': return statValue === value;
                default: return true;
            }
        },
        
        getEvolutionChainLength(evoChain) {
            if (!evoChain || !evoChain.name) return 1;
            
            let maxDepth = 1;
            const traverse = (node, depth) => {
                maxDepth = Math.max(maxDepth, depth);
                if (node.evolves_to) {
                    node.evolves_to.forEach(child => traverse(child, depth + 1));
                }
            };
            
            traverse(evoChain, 1);
            return maxDepth;
        },
        
        getEvolutionPosition(pokemonName, evoChain) {
            let position = -1;
            
            const traverse = (node, depth) => {
                if (node.name === pokemonName) {
                    position = depth - 1;
                    return true;
                }
                if (node.evolves_to) {
                    for (const child of node.evolves_to) {
                        if (traverse(child, depth + 1)) return true;
                    }
                }
                return false;
            };
            
            traverse(evoChain, 1);
            return position;
        },
        
        hasEvolutions(pokemonName, evoChain) {
            const findNode = (node) => {
                if (node.name === pokemonName) {
                    return node.evolves_to && node.evolves_to.length > 0;
                }
                if (node.evolves_to) {
                    for (const child of node.evolves_to) {
                        const result = findNode(child);
                        if (result) return result;
                    }
                }
                return false;
            };
            
            return findNode(evoChain);
        },
        
        hasEvolutionLine(evoChain) {
            if (!evoChain || !evoChain.name) return false;
            return evoChain.evolves_to && evoChain.evolves_to.length > 0;
        },

        hasPreEvolution(pokemonName, evoChain) {
            const findParent = (node, parent = null) => {
                if (node.name === pokemonName) {
                    return parent !== null;
                }
                if (node.evolves_to) {
                    for (const child of node.evolves_to) {
                        if (findParent(child, node)) return true;
                    }
                }
                return false;
            };
            return findParent(evoChain);
        },

        hasDirectBranching(evoChain, pokemonName) {
            const findNode = (node) => {
                if (node.name === pokemonName) {
                    return node.evolves_to && node.evolves_to.length > 1;
                }
                if (node.evolves_to) {
                    for (const child of node.evolves_to) {
                        const result = findNode(child);
                        if (result) return result;
                    }
                }
                return false;
            };
            return findNode(evoChain);
        },

        evolvedFromDirectBranching(pokemonName, evoChain) {
            const findParentWithBranching = (node, parent = null) => {
                if (node.name === pokemonName) {
                    return parent && parent.evolves_to && parent.evolves_to.length > 1;
                }
                if (node.evolves_to) {
                    for (const child of node.evolves_to) {
                        const result = findParentWithBranching(child, node);
                        if (result) return result;
                    }
                }
                return false;
            };
            return findParentWithBranching(evoChain);
        },
        
        sortPokemon(pokemonList, sortBy, sortOrder = 'asc') {
            const sorted = [...pokemonList];
            
            const compare = (a, b) => {
                let valA, valB;
                
                switch (sortBy) {
                    case 'name':
                        valA = a.name;
                        valB = b.name;
                        break;
                    case 'dex':
                        valA = a.dex;
                        valB = b.dex;
                        break;
                    case 'hp':
                        valA = a.stats.hp;
                        valB = b.stats.hp;
                        break;
                    case 'attack':
                        valA = a.stats.attack;
                        valB = b.stats.attack;
                        break;
                    case 'defense':
                        valA = a.stats.defense;
                        valB = b.stats.defense;
                        break;
                    case 'specialAttack':
                        valA = a.stats.special_attack;
                        valB = b.stats.special_attack;
                        break;
                    case 'specialDefense':
                        valA = a.stats.special_defense;
                        valB = b.stats.special_defense;
                        break;
                    case 'speed':
                        valA = a.stats.speed;
                        valB = b.stats.speed;
                        break;
                    case 'bst':
                        valA = a.stats.hp + a.stats.attack + a.stats.defense + 
                               a.stats.special_attack + a.stats.special_defense + a.stats.speed;
                        valB = b.stats.hp + b.stats.attack + b.stats.defense + 
                               b.stats.special_attack + b.stats.special_defense + b.stats.speed;
                        break;
                    case 'height':
                        valA = a.ht;
                        valB = b.ht;
                        break;
                    case 'weight':
                        valA = a.wt;
                        valB = b.wt;
                        break;
                    case 'type':
                        valA = a.types[0] || '';
                        valB = b.types[0] || '';
                        break;
                    default:
                        valA = a.dex;
                        valB = b.dex;
                }
                
                if (typeof valA === 'string') {
                    return sortOrder === 'asc' 
                        ? valA.localeCompare(valB)
                        : valB.localeCompare(valA);
                } else {
                    return sortOrder === 'asc' ? valA - valB : valB - valA;
                }
            };
            
            return sorted.sort(compare);
        },
        
        resetFilters() {
            this.filters = {
                name: '',
                selectedTypes: [],
                typeMatchMode: 'exact',
                ability: null,
                generation: null,
                isLegendary: false,
                isMythical: false,
                isBaby: false,
                isBasic: false,
                isStage1: false,
                isStage2: false,
                isFirstEvolution: false,
                isMiddleEvolution: false,
                isFinalEvolution: false,
                isOnlyEvolution: false,
                hasMultipleBranching: false,
                evolvedFromBranching: false,
                evolvedByItem: false,
                evolvedByAffection: false,
                hp: { value: null, mode: 'higher' },
                attack: { value: null, mode: 'higher' },
                defense: { value: null, mode: 'higher' },
                specialAttack: { value: null, mode: 'higher' },
                specialDefense: { value: null, mode: 'higher' },
                speed: { value: null, mode: 'higher' },
                bst: { value: null, mode: 'higher' },
                eggGroup1: null,
                eggGroup2: null,
                eggGroupMatchMode: 'any',
                moves: [
                    { name: null, method: 'any', version: null },
                    { name: null, method: 'any', version: null },
                    { name: null, method: 'any', version: null },
                    { name: null, method: 'any', version: null }
                ]
            };
            this.sortBy = 'dex';
            this.sortOrder = 'asc';
            this.showResults = false;

            sessionStorage.removeItem('pokedexSearch_filters');
            sessionStorage.removeItem('pokedexSearch_sortBy');
            sessionStorage.removeItem('pokedexSearch_sortOrder');
            sessionStorage.removeItem('pokedexSearch_results');
        },
        
        showDetails(pokemon) {
            sessionStorage.setItem('pokedexSearch_results', JSON.stringify(
                this.filteredPokemon.map(p => p.id)
            ));
            sessionStorage.setItem('pokedexSearch_filters', JSON.stringify(this.filters));
            sessionStorage.setItem('pokedexSearch_sortBy', this.sortBy);
            sessionStorage.setItem('pokedexSearch_sortOrder', this.sortOrder);
            
            window.location.href = `pokemon.html?id=${pokemon.id}`;
        },
        
        formatNumber(num) {
            return String(num).padStart(4, '0');
        },
        
        formatVersionName(version) {
            return version.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },
        
        getStatTotal(pokemon) {
            const s = pokemon.stats;
            return s.hp + s.attack + s.defense + s.special_attack + s.special_defense + s.speed;
        },
        
        getDisplayValue(pokemon) {
            if (this.sortBy === 'hp') return `HP: ${pokemon.stats.hp}`;
            if (this.sortBy === 'attack') return `ATK: ${pokemon.stats.attack}`;
            if (this.sortBy === 'defense') return `DEF: ${pokemon.stats.defense}`;
            if (this.sortBy === 'specialAttack') return `SpA: ${pokemon.stats.special_attack}`;
            if (this.sortBy === 'specialDefense') return `SpD: ${pokemon.stats.special_defense}`;
            if (this.sortBy === 'speed') return `SPD: ${pokemon.stats.speed}`;
            if (this.sortBy === 'height') return `HT: ${(pokemon.ht / 10).toFixed(1)}m`;
            if (this.sortBy === 'weight') return `WT: ${(pokemon.wt / 10).toFixed(1)}kg`;
            return `BST: ${this.getStatTotal(pokemon)}`;
        }
    }
};

Vue.createApp(App).mount('#app');
