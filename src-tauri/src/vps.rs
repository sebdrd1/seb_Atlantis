use ssh2::Session;
use std::io::Read;
use std::net::TcpStream;
use std::time::Duration;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VPSConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub key_path: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VPSStatus {
    pub name: String,
    pub connected: bool,
    pub cpu_usage: Option<f32>,
    pub memory_usage: Option<f32>,
    pub disk_usage: Option<f32>,
    pub uptime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VPSExecReq {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
    pub command: String,
}

pub struct VPSClient {
    session: Option<Session>,
    config: VPSConfig,
}

impl VPSClient {
    pub fn new(config: VPSConfig) -> Self {
        Self { session: None, config }
    }
    
    pub fn is_connected(&self) -> bool {
        self.session.is_some()
    }
    
    pub async fn connect(&mut self) -> Result<()> {
        let tcp = TcpStream::connect_timeout(
            &format!("{}:{}", self.config.host, self.config.port).parse()?,
            Duration::from_secs(10),
        )?;
        
        let mut session = Session::new()?;
        session.set_tcp_stream(tcp);
        session.handshake()?;
        
        if let Some(key_path) = &self.config.key_path {
            session.userauth_pubkey_file(
                &self.config.user,
                None,
                std::path::Path::new(key_path),
                None,
            )?;
        } else if let Some(password) = &self.config.password {
            session.userauth_password(&self.config.user, password)?;
        } else {
            return Err(anyhow::anyhow!("No auth method provided"));
        }
        
        self.session = Some(session);
        Ok(())
    }
    
    pub fn execute(&mut self, command: &str) -> Result<String> {
        let session = self.session.as_mut().ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let mut channel = session.channel_session()?;
        channel.exec(command)?;
        
        let mut output = String::new();
        channel.read_to_string(&mut output)?;
        channel.wait_close()?;
        
        Ok(output)
    }
    
    pub async fn get_status(&mut self) -> Result<VPSStatus> {
        let name = self.config.name.clone();
        
        if !self.is_connected() {
            if let Err(_) = self.connect().await {
                return Ok(VPSStatus {
                    name,
                    connected: false,
                    cpu_usage: None,
                    memory_usage: None,
                    disk_usage: None,
                    uptime: None,
                });
            }
        }
        
        let cpu = self.execute("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").ok();
        let mem = self.execute("free | grep Mem | awk '{print $3/$2 * 100.0}'").ok();
        let disk = self.execute("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'").ok();
        let uptime = self.execute("uptime -p").ok();
        
        Ok(VPSStatus {
            name,
            connected: true,
            cpu_usage: cpu.and_then(|s| s.trim().parse().ok()),
            memory_usage: mem.and_then(|s| s.trim().parse().ok()),
            disk_usage: disk.and_then(|s| s.trim().parse().ok()),
            uptime: uptime.map(|s| s.trim().to_string()),
        })
    }
    
    pub fn disconnect(&mut self) {
        if let Some(session) = self.session.take() {
            let _ = session.disconnect(None, "Bye", None);
        }
    }
}
