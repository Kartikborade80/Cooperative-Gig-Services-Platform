import re
from typing import Dict, Any, Optional

# Pre-defined domain knowledge rules for household & cooperative services
SERVICE_RULES = [
    {
        "category": "Plumbing",
        "keywords": ["pipe", "leak", "leaking", "tap", "faucet", "drain", "clog", "sink", "flush", "water tank", "shower", "plumber"],
        "problems": {
            "leak": ("Pipe / Tap Leakage", "Medium"),
            "clog": ("Drain Blockage / Clog", "High"),
            "tank": ("Water Tank Overflow/Repair", "Medium"),
            "faucet": ("Faucet Replacement", "Low"),
            "default": ("General Plumbing Issue", "Medium")
        },
        "required_skill": "Plumbing"
    },
    {
        "category": "Electrical",
        "keywords": ["spark", "wire", "switch", "mcb", "fuse", "short circuit", "fan", "light", "shock", "power cut", "electrician", "socket"],
        "problems": {
            "spark": ("Electrical Sparking / Danger", "High"),
            "short circuit": ("Short Circuit Hazard", "High"),
            "shock": ("Electric Shock Leakage", "High"),
            "mcb": ("MCB Trip / Fuse Blown", "High"),
            "fan": ("Ceiling Fan Repair / Installation", "Low"),
            "switch": ("Switchboard Malfunction", "Low"),
            "default": ("General Electrical Repair", "Medium")
        },
        "required_skill": "Electrical"
    },
    {
        "category": "AC & Appliance Repair",
        "keywords": ["ac", "air conditioner", "cooling", "not cooling", "gas leak", "refrigerator", "fridge", "washing machine", "microwave"],
        "problems": {
            "cooling": ("AC Not Cooling / Gas Refill", "Medium"),
            "fridge": ("Refrigerator Cooling Failure", "Medium"),
            "washing": ("Washing Machine Drum / Motor Failure", "Medium"),
            "default": ("Appliance Diagnostic & Repair", "Medium")
        },
        "required_skill": "HVAC / AC Technician"
    },
    {
        "category": "Carpentry",
        "keywords": ["wood", "door", "window", "hinge", "cupboard", "lock", "table", "chair", "furniture", "carpenter", "drawer"],
        "problems": {
            "lock": ("Door Lock Jammed / Repair", "High"),
            "hinge": ("Cabinet / Door Hinge Broken", "Medium"),
            "furniture": ("Furniture Assembly / Repair", "Low"),
            "default": ("Woodwork & Carpentry Repair", "Medium")
        },
        "required_skill": "Carpentry"
    },
    {
        "category": "Cleaning & Sanitation",
        "keywords": ["clean", "deep clean", "bathroom", "kitchen cleaning", "pest", "sanitize", "dusting", "mop"],
        "problems": {
            "bathroom": ("Bathroom Deep Cleaning", "Medium"),
            "pest": ("Pest Control / Sanitization", "Medium"),
            "deep clean": ("Full Home Deep Cleaning", "Low"),
            "default": ("General House Cleaning", "Low")
        },
        "required_skill": "House Cleaning & Sanitation"
    },
    {
        "category": "Painting",
        "keywords": ["paint", "wall", "primer", "waterproof", "damp", "seepage", "painter"],
        "problems": {
            "damp": ("Wall Seepage & Waterproofing", "Medium"),
            "seepage": ("Wall Seepage Treatment", "Medium"),
            "paint": ("Wall Touch-up & Painting", "Low"),
            "default": ("Interior Painting Work", "Low")
        },
        "required_skill": "Painting & Finishing"
    }
]

def classify_user_problem(prompt: str) -> Dict[str, Any]:
    """
    Parses natural language prompt into service category, problem title, urgency, and required skill.
    Uses rule-based NLP keyword extraction with graceful fallback.
    """
    cleaned = prompt.lower().strip()
    
    # Priority indicators
    is_urgent = any(w in cleaned for w in ["emergency", "urgent", "danger", "immediately", "hazard", "sparking", "burst", "overflowing"])
    
    best_match = None
    max_matches = 0
    
    for rule in SERVICE_RULES:
        matches = sum(1 for kw in rule["keywords"] if re.search(r'\b' + re.escape(kw) + r'\b', cleaned))
        if matches > max_matches:
            max_matches = matches
            best_match = rule

    if not best_match or max_matches == 0:
        # Fallback general match
        return {
            "category": "General Maintenance",
            "problem": "Unspecified Home Maintenance",
            "urgency": "High" if is_urgent else "Normal",
            "required_skill": "General Maintenance",
            "confidence": 0.65,
            "explanation": "Problem classified under General Maintenance based on description analysis."
        }
    
    # Detect specific problem title
    detected_problem = best_match["problems"]["default"][0]
    detected_urgency = best_match["problems"]["default"][1]
    
    for p_key, (p_title, p_urg) in best_match["problems"].items():
        if p_key != "default" and p_key in cleaned:
            detected_problem = p_title
            detected_urgency = p_urg
            break
            
    if is_urgent:
        detected_urgency = "High"
        
    confidence = min(0.95, 0.70 + (max_matches * 0.08))
    
    return {
        "category": best_match["category"],
        "problem": detected_problem,
        "urgency": detected_urgency,
        "required_skill": best_match["required_skill"],
        "confidence": round(confidence, 2),
        "explanation": f"Detected category '{best_match['category']}' requiring skill '{best_match['required_skill']}' with urgency '{detected_urgency}'."
    }
