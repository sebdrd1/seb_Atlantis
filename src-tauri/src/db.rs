use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use sqlx::{Row, FromRow};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use anyhow::Result;
use once_cell::sync::Lazy;
use tauri::Manager;
use std::path::PathBuf;

pub type DbPool = SqlitePool;

static DB_POOL: Lazy<Arc<RwLock<Option<Arc<DbPool>>>>> = Lazy::new(|| Arc::new(RwLock::new(None)));

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct MemoryItem {
    pub key: String,
    pub value: String,
    pub category: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub model: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub id: i64,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub updated_at: DateTime<Utc>,
}

fn get_db_path(app_handle: &tauri::AppHandle) -> Result<PathBuf> {
    let path = PathBuf::from("C:/Users/sebdrd/Desktop/seb_Atlantis/atlantis.db");
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| anyhow::anyhow!("Failed to create db dir: {}", e))?;
    }
    Ok(path)
}

fn path_to_sqlx_uri(path: &PathBuf) -> String {
    let path_str = path.to_string_lossy().replace(r"\", "/");
    format!("sqlite:///{}", path_str)
}

pub async fn init(app_handle: tauri::AppHandle) -> Result<()> {
    let db_path = get_db_path(&app_handle)?;
    let db_url = path_to_sqlx_uri(&db_path);
    
    eprintln!("Initializing DB at: {}", db_url);
    
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;
    
    sqlx::migrate!("./migrations").run(&pool).await?;
    
    *DB_POOL.write().await = Some(Arc::new(pool));
    eprintln!("DB initialized successfully");
    Ok(())
}

pub async fn get_pool_async() -> Option<Arc<DbPool>> {
    DB_POOL.read().await.as_ref().map(|arc| Arc::clone(arc))
}

pub async fn memory_get_all(category: Option<String>) -> Result<Vec<MemoryItem>> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    
    let items = if let Some(cat) = category {
        sqlx::query_as::<_, MemoryItem>(
            "SELECT key, value, category, created_at, updated_at FROM memory WHERE category = ? ORDER BY updated_at DESC"
        )
        .bind(cat)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, MemoryItem>(
            "SELECT key, value, category, created_at, updated_at FROM memory ORDER BY updated_at DESC"
        )
        .fetch_all(pool)
        .await?
    };
    Ok(items)
}

pub async fn memory_set(key: String, value: String, category: Option<String>) -> Result<()> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    let now = Utc::now();
    
    sqlx::query(
        "INSERT INTO memory (key, value, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, category = ?, updated_at = ?"
    )
    .bind(&key)
    .bind(&value)
    .bind(&category)
    .bind(now)
    .bind(now)
    .bind(&value)
    .bind(&category)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn memory_delete(key: String) -> Result<()> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    
    sqlx::query("DELETE FROM memory WHERE key = ?")
        .bind(key)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn memory_search(query: String) -> Result<Vec<MemoryItem>> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    let like = format!("%{}%", query);
    
    let items = sqlx::query_as::<_, MemoryItem>(
        "SELECT key, value, category, created_at, updated_at FROM memory 
         WHERE key LIKE ? OR value LIKE ? OR category LIKE ? 
         ORDER BY updated_at DESC"
    )
    .bind(&like)
    .bind(&like)
    .bind(&like)
    .fetch_all(pool)
    .await?;
    Ok(items)
}

pub async fn get_settings(key: String) -> Result<Option<String>> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    
    let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    
    Ok(row.map(|r| r.get::<String, _>("value")))
}

pub async fn save_settings(key: String, value: String) -> Result<()> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    let now = Utc::now();
    
    sqlx::query(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?"
    )
    .bind(&key)
    .bind(&value)
    .bind(now)
    .bind(&value)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn session_create(title: String, model: Option<String>) -> Result<String> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    sqlx::query(
        "INSERT INTO sessions (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&title)
    .bind(&model)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(id)
}

pub async fn session_get_all() -> Result<Vec<ChatSession>> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    
    let sessions = sqlx::query_as::<_, ChatSession>(
        "SELECT id, title, model, created_at, updated_at FROM sessions ORDER BY updated_at DESC"
    )
    .fetch_all(pool)
    .await?;
    Ok(sessions)
}

pub async fn session_delete(id: String) -> Result<()> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    
    sqlx::query("DELETE FROM sessions WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn message_add(session_id: String, role: String, content: String) -> Result<i64> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    let now = Utc::now();
    
    let row = sqlx::query(
        "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(&session_id)
    .bind(&role)
    .bind(&content)
    .bind(now)
    .execute(pool)
    .await?;
    
    Ok(row.last_insert_rowid())
}

pub async fn message_get(session_id: String, limit: i64) -> Result<Vec<ChatMessage>> {
    let pool_arc = get_pool_async().await.ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    let pool = pool_arc.as_ref();
    
    let messages = sqlx::query_as::<_, ChatMessage>(
        "SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .bind(&session_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(messages)
}
