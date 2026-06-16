pub mod ai;
pub mod commands;
pub mod db;
pub mod fs;
pub mod vps;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_structure() {
        // Just verify modules compile
    }
}
