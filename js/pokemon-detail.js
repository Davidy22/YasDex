// js/pokemon-detail.js - Fixed to use pokedex search results from session storage
const PokemonDetail = {
    data() {
        return {
            pokemon: null,
            loading: true,
            error: null,
            currentTab: 'about',
            currentMoveMethod: 'level-up',
            availableVersions: [],
            selectedVersion: null,
            isShiny: false,
            previousPokemon: null,
            nextPokemon: null,
            evolutionDetails: new Map(),
            forms: [],
            searchResultIds: [],
            currentSearchIndex: -1,
            currentFlavorIndex: 0,
            flavorDropdownOpen: false,
            hasMoves: false,
            tabs: [
                { id: 'about', name: 'About', icon: 'fas fa-info-circle' }
            ],
            moveMethods: [
                { id: 'level-up', name: 'Level Up', icon: 'fas fa-arrow-up' },
                { id: 'machine', name: 'TM/HM', icon: 'fas fa-compact-disc' },
                { id: 'egg', name: 'Egg Moves', icon: 'fas fa-egg' },
                { id: 'tutor', name: 'Move Tutor', icon: 'fas fa-chalkboard-teacher' }
            ]
        };
    },

    computed: {
        currentSprite() {
            return this.isShiny ? this.pokemon?.shiny : this.pokemon?.sprite;
        },

        totalStats() {
            if (!this.pokemon?.stats) return 0;
            const s = this.pokemon.stats;
            return s.hp + s.attack + s.defense + s.special_attack + s.special_defense + s.speed;
        },

        currentGenus() {
            return this.pokemon?.genus || 'Pokémon';
        },

        headerGradient() {
            if (!this.pokemon?.types || this.pokemon.types.length === 0) {
                return 'background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
            }
            
            const typeColors = {
                normal: { light: '#9ca3af', dark: '#6b7280' },
                fire: { light: '#f97316', dark: '#c2410c' },
                water: { light: '#3b82f6', dark: '#1d4ed8' },
                electric: { light: '#eab308', dark: '#a16207' },
                grass: { light: '#22c55e', dark: '#15803d' },
                ice: { light: '#7dd3fc', dark: '#0284c7' },
                fighting: { light: '#dc2626', dark: '#991b1b' },
                poison: { light: '#a855f7', dark: '#7e22ce' },
                ground: { light: '#ca8a04', dark: '#854d0e' },
                flying: { light: '#a5b4fc', dark: '#4338ca' },
                psychic: { light: '#ec4899', dark: '#be185d' },
                bug: { light: '#65a30d', dark: '#3f6212' },
                rock: { light: '#78716c', dark: '#44403c' },
                ghost: { light: '#6b21a8', dark: '#4a0444' },
                dragon: { light: '#7c3aed', dark: '#4c1d95' },
                dark: { light: '#4b5563', dark: '#1f2937' },
                steel: { light: '#9ca3af', dark: '#4b5563' },
                fairy: { light: '#f9a8d4', dark: '#db2777' }
            };
            
            if (this.pokemon.types.length === 1) {
                const type = this.pokemon.types[0];
                const color = typeColors[type] || { light: '#ef4444', dark: '#b91c1c' };
                return `background: linear-gradient(135deg, ${color.light} 0%, ${color.dark} 100%)`;
            } else {
                const type1 = this.pokemon.types[0];
                const type2 = this.pokemon.types[1];
                const color1 = typeColors[type1]?.light || '#ef4444';
                const color2 = typeColors[type2]?.light || '#ef4444';
                return `background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
            }
        },
        
        currentFlavorText() {
            if (!this.pokemon?.flavor?.length) return 'No Pokédex entry available.';
            return this.pokemon.flavor[this.currentFlavorIndex].text;
        },

        currentFlavorVersion() {
            if (!this.pokemon?.flavor?.length) return '';
            return this.pokemon.flavor[this.currentFlavorIndex].version;
        },

        uniqueFlavorVersions() {
            if (!this.pokemon?.flavor) return [];
            const versions = new Set();
            this.pokemon.flavor.forEach(f => versions.add(f.version));
            return Array.from(versions).sort();
        },

        currentMoves() {
            if (!this.pokemon?.moves || !this.selectedVersion) return [];
            
            const key = `${this.currentMoveMethod}_${this.selectedVersion}`;
            const moves = this.pokemon.moves[key];
            
            if (!moves) return [];

            // Expand move IDs to full move data
            return moves.map(entry => {
                if (Array.isArray(entry)) {
                    const moveData = PokedexData.getMoveById(entry[0]);
                    return {
                        ...moveData,
                        level: entry[1]
                    };
                } else {
                    return PokedexData.getMoveById(entry);
                }
            }).filter(m => m);
        },

        sortedLevelMoves() {
            return this.currentMoves
                .filter(m => m.level !== undefined)
                .sort((a, b) => a.level - b.level);
        },

        genderRatio() {
            if (this.pokemon?.gender === -1) {
                return { male: 0, female: 0, genderless: true };
            }
            const female = (this.pokemon.gender / 8) * 100;
            const male = 100 - female;
            return { male, female, genderless: false };
        },

        evYield() {
            if (!this.pokemon?.ev) return [];
            return Object.entries(this.pokemon.ev)
                .map(([stat, value]) => ({ stat, value }));
        },

        statBars() {
            if (!this.pokemon?.stats) return [];
            const stats = this.pokemon.stats;
            return [
                { name: 'HP', value: stats.hp },
                { name: 'Attack', value: stats.attack },
                { name: 'Defense', value: stats.defense },
                { name: 'Sp. Atk', value: stats.special_attack },
                { name: 'Sp. Def', value: stats.special_defense },
                { name: 'Speed', value: stats.speed }
            ];
        },

        evolutionDisplay() {
            if (!this.pokemon?.evo) return null;
            return this.parseEvolutionForDisplay(this.pokemon.evo);
        },

        isAlternateForm(name) {
            const pokemon = PokedexData.getPokemonByName(name);
            return pokemon ? pokemon.id !== pokemon.dex : false;
        }
    },

    async created() {
        const urlParams = new URLSearchParams(window.location.search);
        const pokemonId = urlParams.get('id');
        
        if (!pokemonId) {
            this.error = 'No Pokémon ID specified';
            this.loading = false;
            return;
        }

        this.loadSearchContext();

        if (!PokedexData.pokemon) {
            await PokedexData.loadAll();
        }
        
        await this.loadPokemon(pokemonId);
        await this.loadNavigation();

        // Add moves tab if Pokémon has moves
        if (this.pokemon && this.pokemon.moves && Object.keys(this.pokemon.moves).length > 0) {
            this.tabs.push({ id: 'moves', name: 'Moves', icon: 'fas fa-fist-raised' });
        }
        
        this.loading = false;

        document.addEventListener('click', this.handleClickOutside);
    },

    beforeDestroy() {
        document.removeEventListener('click', this.handleClickOutside);
    },

    methods: {
        handleClickOutside(event) {
            const dropdown = this.$refs.flavorDropdown;
            const button = this.$refs.flavorButton;
            if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
                this.flavorDropdownOpen = false;
            }
        },

        loadSearchContext() {
            try {
                savedResults = sessionStorage.getItem('pokedexSearch_results');

                if (savedResults) {
                    this.searchResultIds = JSON.parse(savedResults);
                    const currentId = parseInt(new URLSearchParams(window.location.search).get('id'));
                    this.currentSearchIndex = this.searchResultIds.indexOf(currentId);
                    
                    console.log(`Loaded ${this.searchResultIds.length} search results, current index: ${this.currentSearchIndex}`);
                }
            } catch (e) {
                console.warn('Could not load search context', e);
            }
        },

        async loadPokemon(id) {
            this.pokemon = await PokedexData.getPokemonDetails(parseInt(id));
            if (this.pokemon) {
                document.title = `${this.formatName(this.pokemon.name)} - YasDex`;

                // Get all forms
                this.forms = PokedexData.getPokemonByDexNumber(this.pokemon.dex)
                    .filter(p => p.id !== this.pokemon.id);
                
                // Determine available versions
                this.updateAvailableVersions();
                
                // Set default version to newest
                if (this.availableVersions.length > 0) {
                    this.selectedVersion = this.availableVersions[this.availableVersions.length - 1];
                }
                
                await this.preloadEvolutionChain();
            } else {
                this.error = `Pokémon #${id} not found`;
            }
        },

        updateAvailableVersions() {
            if (!this.pokemon?.moves) return;
            
            const versions = new Set();
            Object.keys(this.pokemon.moves).forEach(key => {
                const [, version] = key.split('_');
                versions.add(version);
            });

            this.availableVersions = Array.from(versions).sort((a, b) => {
                const versionA = PokedexData.versionGroups.find(v => v.name === a);
                const versionB = PokedexData.versionGroups.find(v => v.name === b);
                return (versionA?.id || 0) - (versionB?.id || 0);
            });
        },

        async preloadEvolutionChain() {
            if (!this.pokemon?.evo) return;
            
            const loadEvoPokemon = async (node) => {
                if (!node || !node.name) return;

                const pokemon = PokedexData.getPokemonByName(node.name);
                if (pokemon && !this.evolutionDetails.has(pokemon.name)) {
                    const details = await PokedexData.getPokemonDetails(pokemon.id);
                    if (details) {
                        this.evolutionDetails.set(pokemon.name, details);
                    }
                }
                
                if (node.evolves_to && node.evolves_to.length > 0) {
                    for (const child of node.evolves_to) {
                        await loadEvoPokemon(child);
                    }
                }
            };
            
            await loadEvoPokemon(this.pokemon.evo);
        },

        async loadNavigation() {
            if (this.searchResultIds.length > 0) {
                if (this.currentSearchIndex > 0) {
                    const prevId = this.searchResultIds[this.currentSearchIndex - 1];
                    this.previousPokemon = PokedexData.getPokemonById(prevId);
                }
                if (this.currentSearchIndex < this.searchResultIds.length - 1 && this.currentSearchIndex !== -1) {
                    const nextId = this.searchResultIds[this.currentSearchIndex + 1];
                    this.nextPokemon = PokedexData.getPokemonById(nextId);
                }
            } else {
                // Fallback to navigation by dex number
                if (!PokedexData.pokemon) return;
                
                const currentIndex = PokedexData.pokemon.findIndex(p => p.id === this.pokemon.id);
                if (currentIndex > 0) {
                    this.previousPokemon = PokedexData.pokemon[currentIndex - 1];
                }
                if (currentIndex < PokedexData.pokemon.length - 1) {
                    this.nextPokemon = PokedexData.pokemon[currentIndex + 1];
                }
            }
        },

        loadPrevious() {
            if (this.previousPokemon) {
                window.location.href = `pokemon.html?id=${this.previousPokemon.id}`;
            }
        },

        loadNext() {
            if (this.nextPokemon) {
                window.location.href = `pokemon.html?id=${this.nextPokemon.id}`;
            }
        },

        nextFlavor() {
            if (this.pokemon?.flavor && this.currentFlavorIndex < this.pokemon.flavor.length - 1) {
                this.currentFlavorIndex++;
            }
        },

        prevFlavor() {
            if (this.currentFlavorIndex > 0) {
                this.currentFlavorIndex--;
            }
        },

        jumpToFlavor(version) {
            const index = this.pokemon.flavor.findIndex(f => f.version === version);
            if (index !== -1) {
                this.currentFlavorIndex = index;
                this.flavorDropdownOpen = false;
            }
        },

        goBack() {
            window.location.href = 'index.html';
        },

        toggleShiny() {
            this.isShiny = !this.isShiny;
        },

        toggleFlavorDropdown() {
            this.flavorDropdownOpen = !this.flavorDropdownOpen;
        },

        viewPokemon(name) {
            const pokemon = PokedexData.getPokemonByName(name);
            if (pokemon) {
                window.location.href = `pokemon.html?id=${pokemon.id}`;
            }
        },

        viewForm(pokemonId) {
            window.location.href = `pokemon.html?id=${pokemonId}`;
        },

        setVersion(version) {
            this.selectedVersion = version;
        },

        formatName(name) {
            if (!name) return '';
            return name.replace(/-/g, ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },

        formatVersionName(version) {
            return version.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },

        formatMoveEffect(move) {
            if (!move.effect) return '—';
            let effect = move.effect;
            if (move.effect_chance) {
                effect = effect.replace(/\$effect_chance/g, move.effect_chance);
            }
            return effect;
        },

        formatMethodName(method) {
            const names = {
                'level-up': 'Level Up',
                'machine': 'TM/HM',
                'egg': 'Egg Moves',
                'tutor': 'Move Tutor'
            };
            return names[method] || method;
        },

        formatStatName(stat) {
            const names = {
                'hp': 'HP',
                'attack': 'Attack',
                'defense': 'Defense',
                'special_attack': 'Sp. Atk',
                'special_defense': 'Sp. Def',
                'speed': 'Speed'
            };
            return names[stat] || stat;
        },

        getTypeColor(type) {
            return PokedexData.getTypeStyle(type).bg;
        },

        getStatBarColor(value) {
            return PokedexData.getStatBarColor(value);
        },

        getDamageClassIcon(damageClass) {
            const icons = {
                physical: 'fas fa-fist-raised',
                special: 'fas fa-magic',
                status: 'fas fa-shield-alt'
            };
            return icons[damageClass] || 'fas fa-question';
        },

        formatTrigger(trigger) {
            const triggers = {
                'level-up': 'Level Up',
                'trade': 'Trade',
                'use-item': 'Use Item',
                'shed': 'Shed',
                'spin': 'Spin',
                'tower-of-darkness': 'Tower of Darkness',
                'tower-of-waters': 'Tower of Waters',
                'three-critical-hits': '3 Critical Hits',
                'take-damage': 'Take Damage',
                'other': 'Other'
            };
            return triggers[trigger] || trigger;
        },

        formatItem(item) {
            return item ? item.replace(/-/g, ' ') : null;
        },

        getPokemonId(name) {
            const pokemon = PokedexData.getPokemonByName(name);
            return pokemon?.id || 1;
        },

        getPokemonSprite(name) {
            const id = this.getPokemonId(name);
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
        },

        parseEvolutionForDisplay(node, level = 0) {
            if (!node || !node.name) return null;

            const pokemon = PokedexData.getPokemonByName(node.name);
            const sprite = pokemon ? 
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` :
                this.getPokemonSprite(node.name);
            
            const result = {
                name: node.name,
                displayName: this.formatName(node.name),
                sprite: sprite,
                level: node.level,
                min_level: node.min_level,
                trigger: node.trigger,
                item: node.item,
                details: this.evolutionDetails.get(node.name),
                isForm: pokemon ? pokemon.id !== pokemon.dex : false,
                evolves_to: []
            };
            
            if (node.evolves_to && node.evolves_to.length > 0) {
                for (const child of node.evolves_to) {
                    const childEvo = this.parseEvolutionForDisplay(child, level + 1);
                    if (childEvo) {
                        result.evolves_to.push(childEvo);
                    }
                }
            }
            
            return result;
        }
    }
};

const app = Vue.createApp(PokemonDetail);

app.directive('click-outside', {
    beforeMount(el, binding) {
        el.clickOutsideEvent = function(event) {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        document.addEventListener('click', el.clickOutsideEvent);
    },
    unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
    }
});

app.component('evolution-chain', {
    props: ['chain'],
    template: `
        <div class="evolution-chain-container" ref="container">
            <!-- Build columns based on evolution stages -->
            <div class="evolution-columns">
                <!-- Stage 1 column -->
                <div class="evolution-column">
                    <div class="evolution-card" 
                         @click="$emit('view-pokemon', chain.name)">
                        <div class="evolution-circle" :class="getTypeClass(chain.name)">
                            <img :src="getSprite(chain.name)" :alt="chain.name" class="w-16 h-16">
                        </div>
                        <p class="text-sm font-medium capitalize mt-2">{{ formatName(chain.name) }}</p>
                        <p v-if="chain.min_level" class="text-xs text-gray-500">Lv. {{ chain.min_level }}</p>
                        <p v-else-if="chain.item" class="text-xs text-gray-500">{{ formatItem(chain.item) }}</p>
                        <p v-else-if="chain.trigger === 'trade'" class="text-xs text-gray-500">Trade</p>
                    </div>
                </div>
                
                <!-- Stage 2 column -->
                <div v-if="stage2Nodes.length > 0" class="evolution-column">
                    <div v-for="(node, index) in stage2Nodes" :key="index" 
                         class="evolution-card"
                         @click="$emit('view-pokemon', node.name)">
                        <div class="evolution-circle" :class="getTypeClass(node.name)">
                            <img :src="getSprite(node.name)" :alt="node.name" class="w-16 h-16">
                        </div>
                        <p class="text-sm font-medium capitalize mt-2">{{ formatName(node.name) }}</p>
                        <p v-if="node.min_level" class="text-xs text-gray-500">Lv. {{ node.min_level }}</p>
                        <p v-else-if="node.item" class="text-xs text-gray-500">{{ formatItem(node.item) }}</p>
                        <p v-else-if="node.trigger === 'trade'" class="text-xs text-gray-500">Trade</p>
                    </div>
                </div>
                
                <!-- Stage 3 column -->
                <div v-if="stage3Nodes.length > 0" class="evolution-column">
                    <div v-for="(node, index) in stage3Nodes" :key="index" 
                         class="evolution-card"
                         @click="$emit('view-pokemon', node.name)">
                        <div class="evolution-circle" :class="getTypeClass(node.name)">
                            <img :src="getSprite(node.name)" :alt="node.name" class="w-16 h-16">
                        </div>
                        <p class="text-sm font-medium capitalize mt-2">{{ formatName(node.name) }}</p>
                        <p v-if="node.min_level" class="text-xs text-gray-500">Lv. {{ node.min_level }}</p>
                        <p v-else-if="node.item" class="text-xs text-gray-500">{{ formatItem(node.item) }}</p>
                        <p v-else-if="node.trigger === 'trade'" class="text-xs text-gray-500">Trade</p>
                    </div>
                </div>
            </div>
            
            <!-- Connection lines SVG overlay -->
            <svg v-if="isMounted" class="evolution-lines" :viewBox="viewBox" preserveAspectRatio="none">
                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#9ca3af" />
                    </marker>
                </defs>
                <path v-for="(line, index) in connectionLines" 
                      :key="index"
                      :d="line.path" 
                      stroke="#9ca3af"
                      stroke-width="2"
                      stroke-dasharray="5,3"
                      fill="none"
                      marker-end="url(#arrowhead)"/>
            </svg>
        </div>
    `,
    data() {
        return {
            stage2Nodes: [],
            stage3Nodes: [],
            connectionLines: [],
            isMounted: false,
            viewBox: '0 0 100 100',
            nameToNodeMap: new Map()
        };
    },
    mounted() {
        this.isMounted = true;
        this.buildEvolutionStages();

        this.$nextTick(() => {
            this.calculateLines();
        });

        setTimeout(() => {
            this.calculateLines();
        }, 200);
        
        setTimeout(() => {
            this.calculateLines();
        }, 500);
        
        window.addEventListener('resize', this.handleResize);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    },
    watch: {
        chain: {
            handler() {
                this.buildEvolutionStages();
                this.$nextTick(() => {
                    this.calculateLines();
                });
            },
            deep: true
        }
    },
    methods: {
        handleResize() {
            this.calculateLines();
        },
        
        formatName(name) {
            if (!name) return '';
            return name.replace(/-/g, ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },
        
        formatItem(item) {
            return item ? item.replace(/-/g, ' ') : null;
        },
        
        getSprite(name) {
            const pokemon = PokedexData.getPokemonByName(name);
            if (pokemon) {
                return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
            }
            return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
        },
        
        getTypeClass(name) {
            const pokemon = PokedexData.getPokemonByName(name);
            if (pokemon && pokemon.types && pokemon.types.length > 0) {
                const mainType = pokemon.types[0];
                const typeColors = {
                    normal: 'border-gray-500',
                    fire: 'border-orange-500',
                    water: 'border-blue-500',
                    electric: 'border-yellow-500',
                    grass: 'border-green-500',
                    ice: 'border-blue-200',
                    fighting: 'border-red-800',
                    poison: 'border-purple-500',
                    ground: 'border-yellow-600',
                    flying: 'border-indigo-300',
                    psychic: 'border-pink-500',
                    bug: 'border-green-600',
                    rock: 'border-yellow-800',
                    ghost: 'border-purple-800',
                    dragon: 'border-indigo-700',
                    dark: 'border-gray-800',
                    steel: 'border-gray-400',
                    fairy: 'border-pink-300'
                };
                return typeColors[mainType] || 'border-gray-500';
            }
            return 'border-gray-300';
        },
        
        buildEvolutionStages() {
            this.nameToNodeMap.clear();

            this.nameToNodeMap.set(this.chain.name.toLowerCase(), {
                name: this.chain.name,
                stage: 1,
                parent: null
            });

            if (this.chain.evolves_to && this.chain.evolves_to.length > 0) {
                this.stage2Nodes = this.chain.evolves_to.map(child => {
                    this.nameToNodeMap.set(child.name.toLowerCase(), {
                        name: child.name,
                        parent: this.chain.name,
                        stage: 2
                    });
                    return child;
                });
            } else {
                this.stage2Nodes = [];
            }

            const stage3 = [];
            this.stage2Nodes.forEach(node => {
                if (node.evolves_to && node.evolves_to.length > 0) {
                    node.evolves_to.forEach(child => {
                        this.nameToNodeMap.set(child.name.toLowerCase(), {
                            name: child.name,
                            parent: node.name,
                            stage: 3
                        });
                        stage3.push(child);
                    });
                }
            });
            this.stage3Nodes = stage3;
        },
        
        calculateLines() {
            if (!this.isMounted) return;

            const container = this.$refs.container;
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            if (containerRect.width === 0) return;

            const cards = container.querySelectorAll('.evolution-card');
            if (cards.length === 0) return;

            const columnCount = this.stage3Nodes.length > 0 ? 3 : (this.stage2Nodes.length > 0 ? 2 : 1);
            const columnWidth = containerRect.width / columnCount;

            const columnCards = [[], [], []];
            
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const img = card.querySelector('img');
                const name = img ? img.alt : '';
                
                const relX = rect.left - containerRect.left + rect.width / 2;
                const relY = rect.top - containerRect.top + rect.height / 2;

                let colIndex = 0;
                if (columnCount === 2) {
                    colIndex = relX < containerRect.width / 2 ? 0 : 1;
                } else {
                    colIndex = Math.floor(relX / columnWidth);
                    colIndex = Math.min(2, Math.max(0, colIndex));
                }
                
                columnCards[colIndex].push({
                    name: name,
                    x: relX,
                    y: relY,
                    element: card
                });
            });

            columnCards.forEach(col => col.sort((a, b) => a.y - b.y));

            const lines = [];

            // Stage 1 to Stage 2
            if (columnCards[0].length > 0 && columnCards[1].length > 0) {
                columnCards[0].forEach(source => {
                    const sourceName = source.name.toLowerCase();

                    const targets = columnCards[1].filter(target => {
                        const targetName = target.name.toLowerCase();
                        const nodeInfo = this.nameToNodeMap.get(targetName);
                        return nodeInfo && nodeInfo.parent && nodeInfo.parent.toLowerCase() === sourceName;
                    });

                    targets.forEach(target => {
                        const path = this.createPath(source, target);
                        lines.push({ path });
                    });
                });
            }
            
            // Stage 2 to Stage 3
            if (columnCards[1].length > 0 && columnCards[2].length > 0) {
                columnCards[1].forEach(source => {
                    const sourceName = source.name.toLowerCase();
                    
                    const targets = columnCards[2].filter(target => {
                        const targetName = target.name.toLowerCase();
                        const nodeInfo = this.nameToNodeMap.get(targetName);
                        return nodeInfo && nodeInfo.parent && nodeInfo.parent.toLowerCase() === sourceName;
                    });
                    
                    targets.forEach(target => {
                        const path = this.createPath(source, target);
                        lines.push({ path });
                    });
                });
            }

            this.viewBox = `0 0 ${containerRect.width} ${containerRect.height}`;
            this.connectionLines = lines;
        },
        
        createPath(source, target) {
            const startX = source.x;
            const startY = source.y;
            const endX = target.x;
            const endY = target.y;

            const dx = endX - startX;
            const cp1x = startX + dx * 0.25;
            const cp1y = startY;
            const cp2x = startX + dx * 0.75;
            const cp2y = endY;
            
            return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
        }
    }
});

app.mount('#app');
