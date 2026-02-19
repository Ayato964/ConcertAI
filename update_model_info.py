
import json
import os

file_path = 'model_info_response.json'

try:
    # Read existing file (handling utf-16 as observed previously)
    with open(file_path, 'r', encoding='utf-16') as f:
        data = json.load(f)
    
    # Define new rules to add
    new_rules = {
        "gen_measure_count": True,
        "send_context_past": True,
        "send_context_condition": True,
        "send_context_future": True
    }

    # Update rules for each model
    for key, model in data.items():
        if 'rule' not in model:
            model['rule'] = {}
        
        # Merge new rules into existing rules
        # We invoke this for all models as requested ("Api updated") 
        # but specifically it makes most sense for the detailed ones.
        # simpler to apply to all for now or check tags if needed. 
        # For now, applying to all as the user said "Api updated" (global change implication).
        model['rule'].update(new_rules)

    # Write back as UTF-8 (standard)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print("Successfully updated model_info_response.json with new rules.")
    
except Exception as e:
    print(f"Error updating file: {e}")
