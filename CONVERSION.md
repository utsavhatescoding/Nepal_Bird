# Model conversion

The existing H5 file is loaded as weights into the exact architecture in `model_utils.py`. `convert_model.py` exports a TensorFlow SavedModel with a float32 `[None, 224, 224, 3]` input and 85 softmax scores. TensorFlow.js converts that graph, retaining the model's internal preprocessing and inference weights; training-only dropout is removed from inference.

## Isolated environment

Use a disposable Python 3.12 environment, separate from Streamlit:

```bash
python3.12 -m venv .conversion-env
source .conversion-env/bin/activate
pip install tensorflow-cpu==2.20.0 tf-keras==2.20.1 tensorflow-hub==0.16.1 pillow==12.3.0 numpy==2.5.3 h5py==3.16.0 packaging==23.2 setuptools==80.9.0
pip install tensorflowjs==4.22.0 --no-deps
python web/scripts/prepare_converter.py
python web/scripts/export_catalog.py
python web/scripts/convert_model.py
tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model --signature_name=serving_default --saved_model_tags=serve web/.saved-model web/public/model
cd web
npm ci
npm run verify:model
npx playwright install chromium
npm run verify:browser
```

`prepare_converter.py` disables two **optional imports** in the disposable converter environment: the JAX converter export and decision-forest op registration. Those optional dependencies caused incompatible imports alongside TensorFlow 2.20. This model uses neither JAX nor forest operations. The graph converter still validates its actual graph operations. The workaround does not edit model weights or skip model op checking.

Three Python reference tensors and scores are stored in `scripts/fixtures`, outside the production assets. Node tests compare float32 graph predictions; browser tests compare WebGL graph predictions, the image resize path, the upload ranking and notebook persistence.

## Image handling

Pillow antialiased bilinear resizing and a browser's default canvas downsampling produced different scores for the same image. `src/preprocess.js` therefore implements separable bilinear filtering using Pillow's coefficient precision and rounding, before creating a float32 0–255 input tensor. EXIF orientation follows browser decoding. The reference WebP produced identical resized pixels in Chromium. Other browser decoders and transparent-image handling can still differ, so additional real-image checks are required.

## Release checks

Do not claim calibrated confidence, nationwide species coverage, rejection of non-birds, or independently established accuracy. Conversion parity and real-world model accuracy are different checks.
