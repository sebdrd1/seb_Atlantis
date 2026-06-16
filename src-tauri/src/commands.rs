use tauri::{command, AppHandle, State};
use crate::ai::{get_client, ChatMessage, ChatRequest, ModelInfo};
use crate::db::{
    memory_get_all as db_memory_get_all,
    memory_set as db_memory_set,
    memory_delete as db_memory_delete,
    memory_search as db_memory_search,
    get_settings as db_get_settings,
    save_settings as db_save_settings,
    session_create as db_session_create,
    session_get_all as db_session_get_all,
    session_delete as db_session_delete,
    message_add as db_message_add,
    message_get as db_message_get,
    ChatSession,
    MemoryItem,
};
use crate::vps::{VPSClient, VPSConfig, VPSStatus};
use crate::fs::{read_file as fs_read_file, write_file as fs_write_file, list_files as fs_list_files, upload_file as fs_upload_file, FsReadReq, FsWriteReq, FsListReq, FsUploadReq, UploadResult, FileInfo};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct ChatReq {
    pub messages: Vec<ChatMessage>,
    pub model: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub session_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatResp {
    pub content: String,
    pub model: String,
    pub usage: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SetKeyReq {
    pub key: String,
}

#[derive(Debug, Deserialize)]
pub struct VPSExecReq {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
    pub command: String,
}

#[derive(Debug, Deserialize)]
pub struct VPSStatusReq {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MemorySetReq {
    pub key: String,
    pub value: String,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveSettingsReq {
    pub key: String,
    pub value: String,
}

type VPSClients = Mutex<HashMap<String, VPSClient>>;

#[command]
pub async fn chat(request: ChatReq, _app: AppHandle) -> Result<ChatResp, String> {
    let client = get_client();
    let chat_req = ChatRequest {
        model: request.model.clone(),
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream: Some(false),
    };
    
    let resp = client.chat(chat_req).await
        .map_err(|e| e.to_string())?;
    
    let content = resp.choices.first()
        .map(|c| c.message.content.clone())
        .unwrap_or_default();
    
    Ok(ChatResp {
        content,
        model: resp.model,
        usage: resp.usage.map(|u| serde_json::to_value(u).unwrap_or_default()),
    })
}

#[command]
pub async fn chat_stream(request: ChatReq, app: AppHandle) -> Result<(), String> {
    let client = get_client();
    let chat_req = ChatRequest {
        model: request.model.clone(),
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream: Some(true),
    };
    
    client.chat_stream(chat_req, app, "chat-chunk").await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn get_models() -> Result<Vec<ModelInfo>, String> {
    let client = get_client();
    client.get_models().await.map_err(|e| e.to_string())
}

#[command]
pub async fn set_api_key(req: SetKeyReq) -> Result<(), String> {
    let client = get_client();
    client.set_api_key(req.key);
    Ok(())
}

#[command]
pub async fn vps_execute(req: VPSExecReq, state: State<'_, VPSClients>) -> Result<String, String> {
    let mut clients = state.lock().await;
    let client = clients.entry(req.name.clone()).or_insert_with(|| VPSClient::new(VPSConfig {
        name: req.name.clone(),
        host: req.host.clone(),
        port: req.port,
        user: req.user.clone(),
        key_path: req.key_path.clone(),
        password: req.password.clone(),
    }));
    
    if !client.is_connected() {
        client.connect().await.map_err(|e| e.to_string())?;
    }
    
    let output = client.execute(&req.command).map_err(|e| e.to_string())?;
    Ok(output)
}

#[command]
pub async fn vps_status(req: VPSStatusReq, state: State<'_, VPSClients>) -> Result<VPSStatus, String> {
    let mut clients = state.lock().await;
    let client = clients.entry(req.name.clone()).or_insert_with(|| VPSClient::new(VPSConfig {
        name: req.name.clone(),
        host: req.host.clone(),
        port: req.port,
        user: req.user.clone(),
        key_path: req.key_path.clone(),
        password: req.password.clone(),
    }));
    
    let status = client.get_status().await.map_err(|e| e.to_string())?;
    Ok(status)
}

#[command]
pub async fn read_file(req: FsReadReq) -> Result<String, String> {
    fs_read_file(req.path).map_err(|e| e.to_string())
}

#[command]
pub async fn write_file(req: FsWriteReq) -> Result<(), String> {
    fs_write_file(req.path, req.content, req.create_dirs).map_err(|e| e.to_string())
}

#[command]
pub async fn list_files(req: FsListReq) -> Result<Vec<FileInfo>, String> {
    fs_list_files(req.path).map_err(|e| e.to_string())
}

#[command]
pub async fn upload_file(req: FsUploadReq) -> Result<UploadResult, String> {
    fs_upload_file(req.path, req.filename, req.data_base64).map_err(|e| e.to_string())
}

#[command]
pub async fn memory_get(category: Option<String>) -> Result<Vec<MemoryItem>, String> {
    db_memory_get_all(category).await.map_err(|e| e.to_string())
}

#[command]
pub async fn memory_set(req: MemorySetReq) -> Result<(), String> {
    db_memory_set(req.key, req.value, req.category).await.map_err(|e| e.to_string())
}

#[command]
pub async fn memory_delete(key: String) -> Result<(), String> {
    db_memory_delete(key).await.map_err(|e| e.to_string())
}

#[command]
pub async fn memory_search(query: String) -> Result<Vec<MemoryItem>, String> {
    db_memory_search(query).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_settings(key: String) -> Result<Option<String>, String> {
    db_get_settings(key).await.map_err(|e| e.to_string())
}

#[command]
pub async fn save_settings(req: SaveSettingsReq) -> Result<(), String> {
    db_save_settings(req.key, req.value).await.map_err(|e| e.to_string())
}

#[command]
pub async fn session_create(title: String, model: Option<String>) -> Result<String, String> {
    db_session_create(title, model).await.map_err(|e| e.to_string())
}

#[command]
pub async fn session_get_all() -> Result<Vec<ChatSession>, String> {
    db_session_get_all().await.map_err(|e| e.to_string())
}

#[command]
pub async fn session_delete(id: String) -> Result<(), String> {
    db_session_delete(id).await.map_err(|e| e.to_string())
}

#[command]
pub async fn message_add(session_id: String, role: String, content: String) -> Result<i64, String> {
    db_message_add(session_id, role, content).await.map_err(|e| e.to_string())
}

#[command]
pub async fn message_get(session_id: String, limit: i64) -> Result<Vec<crate::db::ChatMessage>, String> {
    db_message_get(session_id, limit).await.map_err(|e| e.to_string())
}
