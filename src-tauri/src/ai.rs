use reqwest::Client;
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use anyhow::Result;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChatChoice>,
    pub usage: Option<ChatUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChoice {
    pub index: u32,
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
    pub delta: Option<ChatMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub context_length: Option<u32>,
    pub pricing: Option<ModelPricing>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPricing {
    pub prompt: String,
    pub completion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelsResponse {
    pub data: Vec<ModelInfo>,
}

static AI_CLIENT: Lazy<AIClient> = Lazy::new(|| AIClient::new());

pub struct AIClient {
    client: Client,
    base_url: String,
    api_key: std::sync::RwLock<Option<String>>,
}

impl AIClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: "https://openrouter.ai/api/v1".to_string(),
            api_key: std::sync::RwLock::new(None),
        }
    }
    
    pub fn set_api_key(&self, key: String) {
        *self.api_key.write().unwrap() = Some(key);
    }
    
    pub fn get_api_key(&self) -> Option<String> {
        self.api_key.read().unwrap().clone()
    }
    
    pub async fn chat(&self, request: ChatRequest) -> Result<ChatResponse> {
        let api_key = self.get_api_key().ok_or_else(|| anyhow::anyhow!("API key not set"))?;
        
        let req = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .build()?;
        
        let response = self.client.execute(req).await?;
        
        if !response.status().is_success() {
            let err = response.text().await?;
            return Err(anyhow::anyhow!("API error: {}", err));
        }
        
        Ok(response.json().await?)
    }
    
    pub async fn chat_stream(
        &self, 
        request: ChatRequest, 
        app_handle: AppHandle,
        event_name: &str
    ) -> Result<()> {
        let api_key = self.get_api_key().ok_or_else(|| anyhow::anyhow!("API key not set"))?;
        
        let stream_req = ChatRequest { stream: Some(true), ..request };
        
        let req = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&stream_req)
            .build()?;
        
        let response = self.client.execute(req).await?;
        
        if !response.status().is_success() {
            let err = response.text().await?;
            return Err(anyhow::anyhow!("API error: {}", err));
        }
        
        let _ = app_handle.emit(event_name, "[STREAM] Streaming not fully implemented - use non-stream chat");
        Ok(())
    }
    
    pub async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        let api_key = self.get_api_key().ok_or_else(|| anyhow::anyhow!("API key not set"))?;
        
        let response = self.client
            .get(&format!("{}/models", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await?;
        
        if !response.status().is_success() {
            let err = response.text().await?;
            return Err(anyhow::anyhow!("API error: {}", err));
        }
        
        let models_resp: ModelsResponse = response.json().await?;
        Ok(models_resp.data)
    }
}

pub fn get_client() -> &'static AIClient {
    &AI_CLIENT
}
