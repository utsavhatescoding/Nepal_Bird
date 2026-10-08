"""Export the field guide, preserving Keras class indices separately from species numbers."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from bird_catalog import build_catalog
from model_utils import load_class_names, split_class_name
names = load_class_names()
indices = {int(split_class_name(name)[0]): index for index, name in enumerate(names)}
rows = [{'index': indices[bird['number']], 'number': bird['number'], 'common': bird['common_name'], 'scientific': bird['scientific_name'], 'order': bird['order'], 'family': bird['family'], 'globalStatus': bird['global_status'], 'nepalStatus': bird['nepal_status']} for bird in build_catalog(names)]
(ROOT / 'web' / 'public' / 'catalog.json').write_text(json.dumps(rows, indent=2))
