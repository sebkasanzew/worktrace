pub fn setup_menu(_app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Get the default menu
    #[cfg(target_os = "macos")]
    {
        use tauri::menu::{HELP_SUBMENU_ID, Menu, MenuItemKind};
        type SetTextFn = Box<dyn Fn(&str) -> tauri::Result<()>>;

        let menu = Menu::default(_app.handle())?;

        if let Some(MenuItemKind::Submenu(help_menu)) = menu.get(HELP_SUBMENU_ID) {
            menu.remove(&help_menu)?;
        }

        // Localize top-level menus
        let locale = sys_locale::get_locale().unwrap_or_else(|| "en-US".to_string());
        let app_name = _app.package_info().name.clone();
        
        for item in menu.items()? {
            if let MenuItemKind::Submenu(submenu) = item {
                let text = submenu.text()?;
                
                // Determine menu type and new title
                let (new_title, menu_type) = match text.as_str() {
                    name if name == app_name => (None, "App"),
                    "File" => (Some(rust_i18n::t!("File", locale = &locale).to_string()), "File"),
                    "Edit" => (Some(rust_i18n::t!("Edit", locale = &locale).to_string()), "Edit"),
                    "View" => (Some(rust_i18n::t!("View", locale = &locale).to_string()), "View"),
                    "Window" => (Some(rust_i18n::t!("Window", locale = &locale).to_string()), "Window"),
                    _ => (None, "Unknown"),
                };

                if let Some(title) = new_title {
                    submenu.set_text(title)?;
                }

                // Translate items inside the submenu
                for subitem in submenu.items()? {
                    let (text, set_text_fn): (String, SetTextFn) = match subitem {
                        MenuItemKind::MenuItem(item) => (item.text()?, Box::new(move |s| item.set_text(s))),
                        MenuItemKind::Predefined(item) => (item.text()?, Box::new(move |s| item.set_text(s))),
                        _ => continue,
                    };

                    let new_text = match (menu_type, text.as_str()) {
                        // App Menu
                        ("App", s) if s.starts_with("About ") => {
                            let name = s.strip_prefix("About ").unwrap_or(&app_name);
                            Some(rust_i18n::t!("About {{app_name}}", locale = &locale, app_name = name).to_string())
                        },
                        ("App", "Services") => Some(rust_i18n::t!("Services", locale = &locale).to_string()),
                        ("App", s) if s.starts_with("Hide ") && s != "Hide Others" => {
                            let name = s.strip_prefix("Hide ").unwrap_or(&app_name);
                            Some(rust_i18n::t!("Hide {{app_name}}", locale = &locale, app_name = name).to_string())
                        },
                        ("App", "Hide Others") => Some(rust_i18n::t!("Hide Others", locale = &locale).to_string()),
                        ("App", "Show All") => Some(rust_i18n::t!("Show All", locale = &locale).to_string()),
                        ("App", s) if s.starts_with("Quit ") => {
                            let name = s.strip_prefix("Quit ").unwrap_or(&app_name);
                            Some(rust_i18n::t!("Quit {{app_name}}", locale = &locale, app_name = name).to_string())
                        },
                        
                        // File Menu
                        ("File", "Close Window") | ("File", "Close") | (_, "Close Window") => Some(rust_i18n::t!("Close Window", locale = &locale).to_string()),
                        
                        // Edit Menu
                        ("Edit", "Undo") => Some(rust_i18n::t!("Undo", locale = &locale).to_string()),
                        ("Edit", "Redo") => Some(rust_i18n::t!("Redo", locale = &locale).to_string()),
                        ("Edit", "Cut") => Some(rust_i18n::t!("Cut", locale = &locale).to_string()),
                        ("Edit", "Copy") => Some(rust_i18n::t!("Copy", locale = &locale).to_string()),
                        ("Edit", "Paste") => Some(rust_i18n::t!("Paste", locale = &locale).to_string()),
                        ("Edit", "Select All") => Some(rust_i18n::t!("Select All", locale = &locale).to_string()),
                        
                        // View Menu
                        ("View", "Enter Full Screen") => Some(rust_i18n::t!("Enter Full Screen", locale = &locale).to_string()),
                        ("View", "Toggle Full Screen") => Some(rust_i18n::t!("Toggle Full Screen", locale = &locale).to_string()),
                        
                        // Window Menu
                        ("Window", "Minimize") => Some(rust_i18n::t!("Minimize", locale = &locale).to_string()),
                        ("Window", "Zoom") => Some(rust_i18n::t!("Zoom", locale = &locale).to_string()),
                        
                        _ => None,
                    };

                    if let Some(t) = new_text {
                        set_text_fn(&t)?;
                    }
                }
            }
        }

        _app.set_menu(menu)?;
    }

    Ok(())
}
