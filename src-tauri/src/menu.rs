use tauri::Emitter;
use tauri::menu::MenuItemBuilder;

#[cfg(not(target_os = "macos"))]
use tauri::menu::{MenuBuilder, SubmenuBuilder};

pub fn setup_menu(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Build the menu
    let check_updates = MenuItemBuilder::new("Check for Updates")
        .id("check_updates")
        .build(app)?;

    // Get the default menu and add our menu item to existing Help submenu
    #[cfg(target_os = "macos")]
    {
        use tauri::menu::{HELP_SUBMENU_ID, Menu, MenuItemKind};
        let menu = Menu::default(app.handle())?;

        // Find the Help submenu and add our item to it
        if let Some(MenuItemKind::Submenu(help_submenu)) = menu.get(HELP_SUBMENU_ID) {
            help_submenu.append(&check_updates)?;
        }

        app.set_menu(menu)?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let help_submenu = SubmenuBuilder::new(app, "Help")
            .item(&check_updates)
            .build()?;

        let menu = MenuBuilder::new(app).item(&help_submenu).build()?;
        app.set_menu(menu)?;
    }

    // Listen for menu events
    app.on_menu_event(move |app, event| {
        if event.id() == "check_updates" {
            log::info!("Check for Updates menu item clicked");
            // Emit event to frontend
            let _ = app.emit("menu://check-for-updates", ());
        }
    });

    Ok(())
}
