use std::path::Path;
use std::fs;
use serde::{Deserialize, Serialize};
use anyhow::Result;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsReadReq {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsWriteReq {
    pub path: String,
    pub content: String,
    pub create_dirs: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsListReq {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsUploadReq {
    pub path: String,
    pub filename: String,
    pub data_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub path: String,
    pub size: u64,
}

pub fn read_file(path: String) -> Result<String> {
    let content = fs::read_to_string(path)?;
    Ok(content)
}

pub fn write_file(path: String, content: String, create_dirs: Option<bool>) -> Result<()> {
    if create_dirs.unwrap_or(false) {
        if let Some(parent) = Path::new(&path).parent() {
            fs::create_dir_all(parent)?;
        }
    }
    fs::write(path, content)?;
    Ok(())
}

pub fn list_files(path: String) -> Result<Vec<FileInfo>> {
    let mut files = Vec::new();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let path_buf = entry.path();
        let name = path_buf.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        files.push(FileInfo {
            name: name.clone(),
            path: path_buf.to_string_lossy().to_string(),
            size: metadata.len(),
            is_dir: metadata.is_dir(),
            modified: metadata.modified().ok().map(|t| {
                let datetime: chrono::DateTime<chrono::Utc> = t.into();
                datetime.to_rfc3339()
            }),
        });
    }
    files.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.cmp(&b.name)
        }
    });
    Ok(files)
}

pub fn upload_file(path: String, filename: String, data_base64: String) -> Result<UploadResult> {
    let full_path = Path::new(&path).join(&filename);
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }
    
    let bytes = general_purpose::STANDARD.decode(data_base64)?;
    let size = bytes.len() as u64;
    fs::write(&full_path, bytes)?;
    
    Ok(UploadResult {
        path: full_path.to_string_lossy().to_string(),
        size,
    })
}
