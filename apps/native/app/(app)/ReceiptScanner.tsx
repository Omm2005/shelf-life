// ReceiptScanner.tsx - Expo component with ExecuTorch OCR
import { useState } from 'react';
import { View, Button, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ExecutorchModule } from 'react-native-executorch';

interface GroceryItem {
  printedProductName: string;
  commonProductName: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
  merchant: string;
  printedDate: string;
  items: GroceryItem[];
}

export default function ReceiptScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize ExecuTorch module (assuming you have an OCR model exported to .pte)
  const loadModel = async () => {
    try {
      // Load your OCR model (.pte file)
      const modelPath = `${FileSystem.documentDirectory}ocr_model.pte`;
      const module = new ExecutorchModule();
      await module.load(modelPath);
      return module;
    } catch (err) {
      console.error('Failed to load model:', err);
      throw err;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (imageUri: string) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Perform OCR using ExecuTorch
      const ocrText = await performOCR(imageUri);

      // Step 2: Send OCR text to Claude API for structured extraction
      const extractedData = await extractReceiptData(ocrText);

      setResult(extractedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const performOCR = async (imageUri: string): Promise<string> => {
    try {
      // Load ExecuTorch OCR model
      const module = await loadModel();

      // Read image file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Preprocess image for model (convert to tensor)
      // This depends on your specific OCR model's input requirements
      const imageData = preprocessImage(base64);

      // Run inference
      const output = await module.forward(imageData);

      // Post-process output to get text
      const text = postprocessOCR(output);

      return text;
    } catch (err) {
      console.error('OCR failed:', err);
      throw new Error('OCR processing failed');
    }
  };

  const preprocessImage = (base64: string): any => {
    // TODO: Implement preprocessing based on your OCR model
    // Typically involves:
    // 1. Decode base64 to image
    // 2. Resize to model input size (e.g., 224x224)
    // 3. Normalize pixel values
    // 4. Convert to tensor format
    
    // Placeholder - replace with actual preprocessing
    return base64;
  };

  const postprocessOCR = (output: any): string => {
    // TODO: Implement postprocessing based on your OCR model output
    // Typically involves:
    // 1. Decode model output (logits/tokens)
    // 2. Apply CTC/attention decoding
    // 3. Convert to readable text
    
    // Placeholder - replace with actual postprocessing
    return output.toString();
  };

  const extractReceiptData = async (ocrText: string): Promise<ReceiptData> => {
    // Send to your API endpoint that uses Claude
    const response = await fetch('YOUR_API_URL/api/extract-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ocrText }),
    });

    const data = await response.json();
    return data.data;
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttons}>
        <Button title="Take Photo" onPress={takePhoto} />
        <Button title="Pick from Gallery" onPress={pickImage} />
      </View>

      {image && (
        <Image source={{ uri: image }} style={styles.image} />
      )}

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text>Processing receipt...</Text>
        </View>
      )}

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {result && (
        <View style={styles.result}>
          <Text style={styles.title}>{result.merchant}</Text>
          <Text style={styles.date}>{result.printedDate}</Text>
          <Text style={styles.subtitle}>Items ({result.items.length}):</Text>
          {result.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text>{item.commonProductName}</Text>
              <Text>${item.price.toFixed(2)} × {item.quantity}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  loading: {
    alignItems: 'center',
    padding: 20,
  },
  error: {
    padding: 20,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
  },
  result: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});
