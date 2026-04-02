import requests
import json
import os
import time
import pickle
from pathlib import Path
from collections import defaultdict

POKEAPI_BASE = "https://pokeapi.co/api/v2"
OUTPUT_DIR = Path("../data")

moves_cache = {}
moves_name_to_id = {}
pokemon_cache = {}
egg_group_lookup = []

def ensure_dir(directory):
    Path(directory).mkdir(parents=True, exist_ok=True)

def fetch_json(url, retries=5, delay=0.2):
    base_delay = delay
    
    for i in range(retries):
        try:
            response = requests.get(url)
            if response.status_code == 200:
                time.sleep(base_delay)
                return response.json()
            elif response.status_code == 429:
                wait_time = (2 ** i) * 5
                print(f"Rate limited! Waiting {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"Attempt {i+1}: Error fetching {url}: {response.status_code}")
                time.sleep(base_delay * (i + 1))
        except Exception as e:
            print(f"Attempt {i+1}: Exception fetching {url}: {e}")
            time.sleep(base_delay * (i + 1))
    
    return None

def generate_types():
    print("\n=== Generating Types ===")
    
    types_file = OUTPUT_DIR / 'types.json'
    if types_file.exists():
        with open(types_file, 'r') as f:
            types = json.load(f)
        print(f"Using existing types.json ({len(types)} types)")
        return types
    
    data = fetch_json(f"{POKEAPI_BASE}/type")
    if not data:
        print("Failed to fetch types")
        return []
    
    types = []
    for type_info in data['results']:
        if type_info['name'] in ['unknown', 'shadow', 'stellar']:
            continue
            
        detail = fetch_json(type_info['url'])
        if not detail:
            continue
            
        type_data = {
            'id': detail['id'],
            'name': detail['name'],
            'damage_relations': {
                'double_damage_to': [t['name'] for t in detail['damage_relations']['double_damage_to']],
                'half_damage_to': [t['name'] for t in detail['damage_relations']['half_damage_to']],
                'no_damage_to': [t['name'] for t in detail['damage_relations']['no_damage_to']]
            },
            'move_damage_class': detail['move_damage_class']['name'] if detail.get('move_damage_class') else None
        }
        types.append(type_data)
        print(f"  Added type: {detail['name']}")

    with open(types_file, 'w') as f:
        json.dump(types, f, indent=2)
    print(f"Generated {len(types)} types")
    return types

def generate_abilities():
    print("\n=== Generating Abilities ===")
    
    abilities_file = OUTPUT_DIR / 'abilities.json'
    if abilities_file.exists():
        with open(abilities_file, 'r') as f:
            abilities = json.load(f)
        print(f"Using existing abilities.json ({len(abilities)} abilities)")
        return abilities
    
    data = fetch_json(f"{POKEAPI_BASE}/ability?limit=100000")
    if not data:
        print("Failed to fetch abilities")
        return []
    
    abilities = []
    for i, ability_info in enumerate(data['results']):
        if i % 50 == 0:
            print(f"  Processing ability {i+1}/{len(data['results'])}")
        
        detail = fetch_json(ability_info['url'])
        if not detail:
            continue
        
        effect = ""
        short_effect = ""
        for entry in detail.get('effect_entries', []):
            if entry['language']['name'] == 'en':
                effect = entry['effect']
                short_effect = entry.get('short_effect', '')
                break
        
        ability_data = {
            'id': detail['id'],
            'name': detail['name'],
            'effect': effect if effect else "",
            'short_effect': short_effect if short_effect else ""
        }
        abilities.append(ability_data)

    abilities.sort(key=lambda x: x['name'])
    
    with open(abilities_file, 'w') as f:
        json.dump(abilities, f, indent=2)
    print(f"Generated {len(abilities)} abilities")
    return abilities

def generate_moves():
    print("\n=== Generating Moves ===")
    
    moves_file = OUTPUT_DIR / 'moves.json'
    if moves_file.exists():
        with open(moves_file, 'r') as f:
            moves = json.load(f)
        print(f"Using existing moves.json ({len(moves)} moves)")
        return moves
    
    data = fetch_json(f"{POKEAPI_BASE}/move?limit=100000")
    if not data:
        print("Failed to fetch moves")
        return []
    
    moves = []
    for i, move_info in enumerate(data['results']):
        if i % 100 == 0:
            print(f"  Processing move {i+1}/{len(data['results'])}")
        
        detail = fetch_json(move_info['url'])
        if not detail:
            continue
        
        effect = ""
        for entry in detail.get('effect_entries', []):
            if entry['language']['name'] == 'en':
                effect = entry.get('short_effect', entry['effect'])
                break
        
        move_data = {
            'id': detail['id'],
            'name': detail['name'],
            'power': detail.get('power'),
            'pp': detail.get('pp'),
            'accuracy': detail.get('accuracy'),
            'type': detail['type']['name'] if detail.get('type') else None,
            'damage_class': detail['damage_class']['name'] if detail.get('damage_class') else None,
            'effect': effect,
            'effect_chance': detail.get('effect_chance')
        }
        moves.append(move_data)

    moves.sort(key=lambda x: x['name'])
    
    with open(moves_file, 'w') as f:
        json.dump(moves, f, indent=2)
    print(f"Generated {len(moves)} moves")
    return moves

def generate_egg_groups():
    print("\n=== Generating Egg Groups ===")
    
    egg_groups_file = OUTPUT_DIR / 'egg-groups.json'
    if egg_groups_file.exists():
        with open(egg_groups_file, 'r') as f:
            egg_groups = json.load(f)
        print(f"Using existing egg-groups.json ({len(egg_groups)} egg groups)")
        return egg_groups
    
    data = fetch_json(f"{POKEAPI_BASE}/egg-group?limit=100")
    if not data:
        print("Failed to fetch egg groups")
        return []
    
    egg_groups = []
    for egg_info in data['results']:
        detail = fetch_json(egg_info['url'])
        if not detail:
            continue
        if egg_info['name'] in ['ditto']:
            continue

        names = {}
        for name_entry in detail.get('names', []):
            lang = name_entry['language']['name']
            names[lang] = name_entry['name']
        
        egg_data = {
            'id': detail['id'],
            'name': detail['name'],
            'names': names,
            'pokemon_count': len(detail.get('pokemon_species', []))
        }
        egg_groups.append(egg_data)
        print(f"  Added egg group: {detail['name']}")

    egg_groups.sort(key=lambda x: x['name'])
    
    with open(egg_groups_file, 'w') as f:
        json.dump(egg_groups, f, indent=2)
    print(f"Generated {len(egg_groups)} egg groups")
    return egg_groups

def generate_version_groups():
    print("\n=== Generating Version Groups ===")
    
    versions_file = OUTPUT_DIR / 'version-groups.json'
    if versions_file.exists():
        with open(versions_file, 'r') as f:
            version_groups = json.load(f)
        print(f"Using existing version-groups.json ({len(version_groups)} version groups)")
        return version_groups
    
    data = fetch_json(f"{POKEAPI_BASE}/version-group?limit=10000")
    if not data:
        print("Failed to fetch version groups")
        return []
    
    version_groups = []
    for version_info in data['results']:
        detail = fetch_json(version_info['url'])
        if not detail:
            continue
        
        version_data = {
            'id': detail['id'],
            'name': detail['name'],
            'generation': detail['generation']['name'],
            'versions': [v['name'] for v in detail.get('versions', [])]
        }
        version_groups.append(version_data)

    version_groups.sort(key=lambda x: x['id'])
    
    with open(versions_file, 'w') as f:
        json.dump(version_groups, f, indent=2)
    print(f"Generated {len(version_groups)} version groups")
    return version_groups

def generate_pokemon_list():
    print("\n=== Generating Pokémon ===")
    
    pokedex_file = OUTPUT_DIR / 'pokemon.json'
    if pokedex_file.exists():
        with open(pokedex_file, 'r') as f:
            existing = json.load(f)
        print(f"Found existing pokemon.json with {len(existing)} Pokémon")
    
    with open(OUTPUT_DIR / 'types.json', 'r') as f:
        types_list = json.load(f)
    with open(OUTPUT_DIR / 'abilities.json', 'r') as f:
        abilities_list = json.load(f)
    
    type_names = {t['name'] for t in types_list}
    ability_names = {a['name'] for a in abilities_list}

    data = fetch_json(f"{POKEAPI_BASE}/pokemon?limit=100000")
    if not data:
        print("Failed to fetch pokemon list")
        return None
    
    complete_pokedex = {}
    total = len(data['results'])
    
    for i, pokemon_info in enumerate(data['results']):
        if i % 50 == 0:
            print(f"  Processing Pokémon {i+1}/{total}")
        
        detail = fetch_json(pokemon_info['url'])
        if not detail:
            continue

        species = fetch_json(detail['species']['url'])

        pokedex_number = None
        if species and species.get('pokedex_numbers'):
            for entry in species['pokedex_numbers']:
                if entry['pokedex']['name'] == 'national':
                    pokedex_number = entry['entry_number']
                    break

        if not pokedex_number:
            pokedex_number = detail['id']

        types = []
        for t in detail['types']:
            type_name = t['type']['name']
            if type_name in type_names:
                types.append(type_name)

        abilities = []
        for a in detail['abilities']:
            ability_name = a['ability']['name']
            if ability_name in ability_names:
                abilities.append(ability_name)

        stats = {}
        for s in detail['stats']:
            stat_name = s['stat']['name'].replace('-', '_')
            stats[stat_name] = s['base_stat']

        temp_egg_groups = []
        egg_groups = []
        if species:
            temp_egg_groups = [g['name'] for g in species.get('egg_groups', [])]
        
        global egg_group_lookup
        for g in temp_egg_groups:
            for eg in egg_group_lookup:
                if eg['name'] == g:
                    egg_groups.append(eg['names']['en'])
                    break

        evolution_chain = []
        if species and species.get('evolution_chain'):
            chain_data = fetch_json(species['evolution_chain']['url'])
            if chain_data:
                evolution_chain = parse_evolution_chain(chain_data['chain'])

        moves_by_method = defaultdict(list)
        for move_data in detail['moves']:
            move_name = move_data['move']['name']
            move_id = get_move_id(move_name)
            
            if not move_id:
                continue
            
            for version_detail in move_data['version_group_details']:
                method = version_detail['move_learn_method']['name']
                version_group = version_detail['version_group']['name']
                level = version_detail.get('level_learned_at', 0)
                
                key = f"{method}_{version_group}"
                
                if method == 'level-up':
                    moves_by_method[key].append([move_id, level])
                else:
                    moves_by_method[key].append(move_id)

        ev_yield = {}
        for s in detail['stats']:
            if s['effort'] > 0:
                stat_name = s['stat']['name'].replace('-', '_')
                ev_yield[stat_name] = s['effort']

        alternate_forms = []

        genus = ""
        if species and species.get('genera'):
            for g in species['genera']:
                if g['language']['name'] == 'en':
                    genus = g['genus']
                    break

        names = {}
        if species and species.get('names'):
            for name_entry in species['names']:
                lang = name_entry['language']['name']
                names[lang] = name_entry['name']

        flavor_texts = []
        if species:
            for entry in species.get('flavor_text_entries', []):
                if entry['language']['name'] == 'en':
                    flavor_texts.append({
                        'version': entry['version']['name'],
                        'text': entry['flavor_text'].replace('\n', ' ').replace('\f', ' ')
                    })

        complete_pokedex[detail['id']] = {
            'id': detail['id'],
            'name': detail['name'],
            'dex': pokedex_number,
            'genus': genus,
            'names': names,
            'ht': detail['height'],
            'wt': detail['weight'],
            'exp': detail['base_experience'],
            'types': types,
            'abils': [{
                'n': a['ability']['name'],
                'h': a['is_hidden'],
                's': a['slot'],
                'effect': get_ability_short_effect(a['ability']['name'])
            } for a in detail['abilities']],
            'stats': stats,
            'moves': dict(moves_by_method),
            'species': species['name'] if species else detail['name'],
            'gen': species['generation']['name'] if species and species.get('generation') else None,
            'leg': species.get('is_legendary', False) if species else False,
            'myth': species.get('is_mythical', False) if species else False,
            'baby': species.get('is_baby', False) if species else False,
            'eggs': egg_groups,
            'flavor': flavor_texts,
            'evo': evolution_chain,
            'sprite': f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{detail['id']}.png",
            'shiny': f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{detail['id']}.png",
            'capture': species.get('capture_rate') if species else None,
            'happiness': species.get('base_happiness') if species else None,
            'growth': species['growth_rate']['name'] if species and species.get('growth_rate') else None,
            'gender': species.get('gender_rate') if species else None,
            'hatch': species.get('hatch_counter') if species else None,
            'ev': ev_yield,
            'forms': []
        }

    print("\n  Adding alternate forms...")
    for pid, pokemon in complete_pokedex.items():
        forms = []
        for other_id, other in complete_pokedex.items():
            if other['dex'] == pokemon['dex'] and other['id'] != pokemon['id']:
                forms.append({
                    'id': other['id'],
                    'name': other['name'],
                    'sprite': other['sprite']
                })

    complete_pokedex = propagate_all_egg_moves_to_dict(complete_pokedex)

    with open(OUTPUT_DIR / 'pokemon.json', 'w') as f:
        json.dump(complete_pokedex, f, separators=(',', ':'))

    return complete_pokedex

def propagate_all_egg_moves_to_dict(pokedex):
    print("  Propagating egg moves...")
    updated_count = 0
    
    for pid, pokemon in pokedex.items():
        if 'evo' in pokemon and pokemon['evo']:
            # Find basic form
            def find_basic(node):
                if not node or not node.get('evolves_to'):
                    return node
                return find_basic(node['evolves_to'][0])
            
            basic_node = find_basic(pokemon['evo'])
            if basic_node and basic_node['name'] != pokemon['name']:
                # Find basic Pokémon in pokedex
                basic_pokemon = None
                for other in pokedex.values():
                    if other['name'] == basic_node['name']:
                        basic_pokemon = other
                        break
                
                if basic_pokemon and basic_pokemon.get('moves'):
                    # Get egg moves from basic
                    basic_egg_moves = {}
                    for key, moves in basic_pokemon['moves'].items():
                        if key.startswith('egg_'):
                            basic_egg_moves[key] = moves.copy()
                    
                    if basic_egg_moves:
                        if 'moves' not in pokemon:
                            pokemon['moves'] = {}
                        
                        for egg_key, egg_moves in basic_egg_moves.items():
                            if egg_key not in pokemon['moves']:
                                pokemon['moves'][egg_key] = []
                            
                            existing = set()
                            for move in pokemon['moves'][egg_key]:
                                if isinstance(move, list):
                                    existing.add(move[0])
                                else:
                                    existing.add(move)
                            
                            for move in egg_moves:
                                move_id = move[0] if isinstance(move, list) else move
                                if move_id not in existing:
                                    pokemon['moves'][egg_key].append(move)
                            
                            pokemon['moves'][egg_key].sort()
                        
                        updated_count += 1
    return pokedex

def parse_evolution_chain(chain):
    evolutions = []
    
    def traverse(node, level=0):
        evo_details = node.get('evolution_details', [{}])[0] if node.get('evolution_details') else {}
        
        evo_data = {
            'name': node['species']['name'],
            'level': level,
            'min_level': evo_details.get('min_level'),
            'trigger': evo_details.get('trigger', {}).get('name') if evo_details.get('trigger') else None,
            'item': evo_details.get('item', {}).get('name') if evo_details.get('item') else None,
            'held_item': evo_details.get('held_item', {}).get('name') if evo_details.get('held_item') else None,
            'known_move': evo_details.get('known_move', {}).get('name') if evo_details.get('known_move') else None,
            'known_move_type': evo_details.get('known_move_type', {}).get('name') if evo_details.get('known_move_type') else None,
            'location': evo_details.get('location', {}).get('name') if evo_details.get('location') else None,
            'min_affection': evo_details.get('min_affection'),
            'min_beauty': evo_details.get('min_beauty'),
            'min_happiness': evo_details.get('min_happiness'),
            'needs_overworld_rain': evo_details.get('needs_overworld_rain', False),
            'time_of_day': evo_details.get('time_of_day'),
            'turn_upside_down': evo_details.get('turn_upside_down', False),
            'evolves_to': []
        }
        
        for next_evo in node.get('evolves_to', []):
            evo_data['evolves_to'].append(traverse(next_evo, level + 1))
        
        return evo_data
    
    return traverse(chain)

def load_moves_cache():
    global moves_cache, moves_name_to_id
    moves_file = OUTPUT_DIR / 'moves.json'
    if moves_file.exists():
        with open(moves_file, 'r') as f:
            moves = json.load(f)
            moves_cache = {move['id']: move for move in moves}
            moves_name_to_id = {move['name']: move['id'] for move in moves}

def get_move_id(move_name):
    if not moves_name_to_id:
        load_moves_cache()
    return moves_name_to_id.get(move_name)

def get_ability_short_effect(ability_name):
    abilities_file = OUTPUT_DIR / 'abilities.json'
    if abilities_file.exists():
        with open(abilities_file, 'r') as f:
            abilities = json.load(f)
            for ability in abilities:
                if ability['name'] == ability_name:
                    return ability.get('short_effect', '')
    return ""

def main():
    print("Starting Pokédex Data Generation")
    print("================================")
    
    ensure_dir(OUTPUT_DIR)
    
    generate_types()
    generate_abilities()
    generate_moves()
    generate_version_groups()
    global egg_group_lookup
    egg_group_lookup = generate_egg_groups()
    generate_pokemon_list()
    
    print("\n=========================")
    print("DATA GENERATION COMPLETE!")
    print("=========================")

if __name__ == "__main__":
    main()
