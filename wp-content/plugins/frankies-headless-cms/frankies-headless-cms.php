<?php
/**
 * Plugin Name: Frankies Headless CMS
 * Description: Structured content and REST output for the Frankies Burrito headless frontend.
 * Version: 0.1.0
 * Author: Codex
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Frankies_Headless_CMS {
	const OPTION_KEY = 'frankies_headless_settings';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_types' ) );
		add_action( 'admin_menu', array( __CLASS__, 'register_settings_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin_assets' ) );
		add_action( 'save_post_fb_testimonial', array( __CLASS__, 'save_testimonial_meta' ) );
		add_action( 'save_post_fb_location', array( __CLASS__, 'save_location_meta' ) );
		add_action( 'save_post_fb_press_item', array( __CLASS__, 'save_press_meta' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
	}

	public static function activate() {
		self::register_post_types();
		self::seed_defaults();
		flush_rewrite_rules();
	}

	public static function deactivate() {
		flush_rewrite_rules();
	}

	public static function register_post_types() {
		register_post_type(
			'fb_testimonial',
			array(
				'labels'       => array(
					'name'          => __( 'Testimonials', 'frankies-headless-cms' ),
					'singular_name' => __( 'Testimonial', 'frankies-headless-cms' ),
				),
				'public'       => false,
				'show_ui'      => false,
				'show_in_menu' => false,
				'supports'     => array( 'title', 'editor', 'thumbnail', 'page-attributes' ),
				'menu_icon'    => 'dashicons-format-quote',
			)
		);

		register_post_type(
			'fb_location',
			array(
				'labels'       => array(
					'name'          => __( 'Locations', 'frankies-headless-cms' ),
					'singular_name' => __( 'Location', 'frankies-headless-cms' ),
				),
				'public'       => false,
				'show_ui'      => false,
				'show_in_menu' => false,
				'supports'     => array( 'title', 'editor', 'thumbnail', 'page-attributes' ),
				'menu_icon'    => 'dashicons-location-alt',
			)
		);

		register_post_type(
			'fb_press_item',
			array(
				'labels'       => array(
					'name'          => __( 'Press Items', 'frankies-headless-cms' ),
					'singular_name' => __( 'Press Item', 'frankies-headless-cms' ),
				),
				'public'       => false,
				'show_ui'      => false,
				'show_in_menu' => false,
				'supports'     => array( 'title', 'editor', 'thumbnail', 'page-attributes' ),
				'menu_icon'    => 'dashicons-megaphone',
			)
		);
	}

	public static function register_meta_boxes() {
		add_meta_box(
			'fb_testimonial_meta',
			__( 'Testimonial Details', 'frankies-headless-cms' ),
			array( __CLASS__, 'render_testimonial_meta_box' ),
			'fb_testimonial',
			'normal',
			'default'
		);

		add_meta_box(
			'fb_location_meta',
			__( 'Location Details', 'frankies-headless-cms' ),
			array( __CLASS__, 'render_location_meta_box' ),
			'fb_location',
			'normal',
			'default'
		);

		add_meta_box(
			'fb_press_meta',
			__( 'Press Details', 'frankies-headless-cms' ),
			array( __CLASS__, 'render_press_meta_box' ),
			'fb_press_item',
			'normal',
			'default'
		);
	}

	public static function render_testimonial_meta_box( $post ) {
		wp_nonce_field( 'fb_testimonial_meta', 'fb_testimonial_meta_nonce' );
		$author = get_post_meta( $post->ID, '_fb_author', true );
		echo '<p class="description">' . esc_html__( 'Use the main editor for the quote text. Add the person or publication name here.', 'frankies-headless-cms' ) . '</p>';
		self::render_text_input(
			'fb_author',
			__( 'Author name', 'frankies-headless-cms' ),
			$author,
			__( 'Example: Alex Orchilles', 'frankies-headless-cms' )
		);
	}

	public static function render_location_meta_box( $post ) {
		wp_nonce_field( 'fb_location_meta', 'fb_location_meta_nonce' );
		echo '<p class="description">' . esc_html__( 'Use the main editor for the location description. Keep menu and order links current so the frontend buttons stay accurate.', 'frankies-headless-cms' ) . '</p>';
		self::render_text_input(
			'fb_city',
			__( 'City / area label', 'frankies-headless-cms' ),
			get_post_meta( $post->ID, '_fb_city', true ),
			__( 'Example: Miami MiMo or Hallandale', 'frankies-headless-cms' )
		);
		self::render_text_input(
			'fb_address',
			__( 'Address', 'frankies-headless-cms' ),
			get_post_meta( $post->ID, '_fb_address', true ),
			__( 'Example: 6600 Biscayne Blvd, Miami, FL 33138', 'frankies-headless-cms' )
		);
		self::render_textarea_input(
			'fb_hours',
			__( 'Hours', 'frankies-headless-cms' ),
			get_post_meta( $post->ID, '_fb_hours', true ),
			3,
			__( "Example:\nMon-Thu 11am-10pm\nFri-Sat 11am-12am", 'frankies-headless-cms' )
		);
		self::render_text_input(
			'fb_phone',
			__( 'Phone', 'frankies-headless-cms' ),
			get_post_meta( $post->ID, '_fb_phone', true ),
			__( 'Example: (305) 555-0100', 'frankies-headless-cms' )
		);
		self::render_url_input(
			'fb_menu_url',
			__( 'Menu page URL', 'frankies-headless-cms' ),
			get_post_meta( $post->ID, '_fb_menu_url', true ),
			__( 'Example: https://www.yoursite.com/miamimenu', 'frankies-headless-cms' )
		);
		self::render_url_input(
			'fb_order_url',
			__( 'Order URL', 'frankies-headless-cms' ),
			get_post_meta( $post->ID, '_fb_order_url', true ),
			__( 'Example: https://frankiesbreakfastburritos.toast.site/', 'frankies-headless-cms' )
		);
	}

	public static function render_press_meta_box( $post ) {
		wp_nonce_field( 'fb_press_meta', 'fb_press_meta_nonce' );
		$outlet = get_post_meta( $post->ID, '_fb_outlet', true );
		$url    = get_post_meta( $post->ID, '_fb_url', true );
		echo '<p class="description">' . esc_html__( 'Use the main editor for the short description or excerpt shown with the article.', 'frankies-headless-cms' ) . '</p>';
		self::render_text_input(
			'fb_outlet',
			__( 'Outlet', 'frankies-headless-cms' ),
			$outlet,
			__( 'Example: Miami New Times', 'frankies-headless-cms' )
		);
		self::render_url_input(
			'fb_url',
			__( 'Article URL', 'frankies-headless-cms' ),
			$url,
			__( 'Paste the full article link.', 'frankies-headless-cms' )
		);
	}

	public static function customize_title_placeholder( $title, $post ) {
		if ( 'fb_testimonial' === $post->post_type ) {
			return __( 'Add a short label for this testimonial', 'frankies-headless-cms' );
		}

		if ( 'fb_location' === $post->post_type ) {
			return __( 'Add the location name', 'frankies-headless-cms' );
		}

		if ( 'fb_press_item' === $post->post_type ) {
			return __( 'Add the press headline', 'frankies-headless-cms' );
		}

		return $title;
	}

	public static function render_editor_help( $post ) {
		if ( ! in_array( $post->post_type, array( 'fb_testimonial', 'fb_location', 'fb_press_item' ), true ) ) {
			return;
		}

		$message = '';

		if ( 'fb_testimonial' === $post->post_type ) {
			$message = __( 'Enter the quote in the main editor. Use the Order field in Page Attributes to control which testimonial appears first.', 'frankies-headless-cms' );
		} elseif ( 'fb_location' === $post->post_type ) {
			$message = __( 'Enter the location description in the main editor. Use the details box below for address, hours, menu link, and order link.', 'frankies-headless-cms' );
		} elseif ( 'fb_press_item' === $post->post_type ) {
			$message = __( 'Enter the press summary in the main editor. Use the details box below for outlet name and article link.', 'frankies-headless-cms' );
		}

		echo '<div class="notice notice-info inline"><p>' . esc_html( $message ) . '</p></div>';
	}

	public static function save_testimonial_meta( $post_id ) {
		if ( ! self::can_save_meta( $post_id, 'fb_testimonial_meta_nonce', 'fb_testimonial_meta' ) ) {
			return;
		}

		update_post_meta( $post_id, '_fb_author', sanitize_text_field( wp_unslash( $_POST['fb_author'] ?? '' ) ) );
	}

	public static function save_location_meta( $post_id ) {
		if ( ! self::can_save_meta( $post_id, 'fb_location_meta_nonce', 'fb_location_meta' ) ) {
			return;
		}

		$fields = array( 'address', 'city', 'menu_url', 'order_url', 'hours', 'phone' );
		foreach ( $fields as $field ) {
			$value = wp_unslash( $_POST[ 'fb_' . $field ] ?? '' );
			$value = in_array( $field, array( 'menu_url', 'order_url' ), true ) ? esc_url_raw( $value ) : sanitize_text_field( $value );
			update_post_meta( $post_id, '_fb_' . $field, $value );
		}
	}

	public static function save_press_meta( $post_id ) {
		if ( ! self::can_save_meta( $post_id, 'fb_press_meta_nonce', 'fb_press_meta' ) ) {
			return;
		}

		update_post_meta( $post_id, '_fb_outlet', sanitize_text_field( wp_unslash( $_POST['fb_outlet'] ?? '' ) ) );
		update_post_meta( $post_id, '_fb_url', esc_url_raw( wp_unslash( $_POST['fb_url'] ?? '' ) ) );
	}

	private static function can_save_meta( $post_id, $nonce_name, $nonce_action ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return false;
		}

		if ( ! isset( $_POST[ $nonce_name ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ $nonce_name ] ) ), $nonce_action ) ) {
			return false;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return false;
		}

		return true;
	}

	private static function render_text_input( $id, $label, $value, $placeholder = '' ) {
		echo '<p><label for="' . esc_attr( $id ) . '"><strong>' . esc_html( $label ) . '</strong></label></p>';
		echo '<input type="text" id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '" value="' . esc_attr( $value ) . '" class="widefat" placeholder="' . esc_attr( $placeholder ) . '" />';
	}

	private static function render_url_input( $id, $label, $value, $placeholder = '' ) {
		echo '<p><label for="' . esc_attr( $id ) . '"><strong>' . esc_html( $label ) . '</strong></label></p>';
		echo '<input type="url" id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '" value="' . esc_attr( $value ) . '" class="widefat" placeholder="' . esc_attr( $placeholder ) . '" />';
	}

	private static function render_textarea_input( $id, $label, $value, $rows = 4, $placeholder = '' ) {
		echo '<p><label for="' . esc_attr( $id ) . '"><strong>' . esc_html( $label ) . '</strong></label></p>';
		echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $id ) . '" rows="' . absint( $rows ) . '" class="widefat" placeholder="' . esc_attr( $placeholder ) . '">' . esc_textarea( $value ) . '</textarea>';
	}

	public static function register_settings_page() {
		add_menu_page(
			__( 'Site Pages', 'frankies-headless-cms' ),
			__( 'Site Pages', 'frankies-headless-cms' ),
			'manage_options',
			'frankies-headless-content',
			array( __CLASS__, 'render_settings_page' ),
			'dashicons-store',
			3
		);

		add_submenu_page(
			'frankies-headless-content',
			__( 'Pages Overview', 'frankies-headless-cms' ),
			__( 'Overview', 'frankies-headless-cms' ),
			'manage_options',
			'frankies-headless-content',
			array( __CLASS__, 'render_settings_page' )
		);

		add_submenu_page(
			'frankies-headless-content',
			__( 'Page Editors', 'frankies-headless-cms' ),
			__( 'Page Editors', 'frankies-headless-cms' ),
			'manage_options',
			'frankies-headless-page-editors',
			array( __CLASS__, 'render_page_editors_page' )
		);

		foreach ( self::page_editor_configs() as $page ) {
			add_submenu_page(
				'frankies-headless-content',
				$page['title'],
				$page['title'],
				'manage_options',
				$page['menu_slug'],
				array( __CLASS__, 'render_page_editors_page' )
			);
		}
	}

	public static function register_settings() {
		register_setting(
			'frankies_headless_group',
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize_settings' ),
				'default'           => self::default_settings(),
			)
		);
	}

	public static function render_section_help( $section ) {
		$help = self::section_help_text( $section['id'] );

		if ( $help ) {
			echo '<p>' . esc_html( $help ) . '</p>';
		}
	}

	private static function section_help_text( $section_id ) {
		$help = array(
			'frankies_headless_branding'          => __( 'Core brand labels used across the homepage.', 'frankies-headless-cms' ),
			'frankies_headless_home_hero'         => __( 'Main homepage heading and intro copy.', 'frankies-headless-cms' ),
			'frankies_headless_home_menu'         => __( 'Homepage buttons, Instagram link, and footer text.', 'frankies-headless-cms' ),
			'frankies_headless_home_images'       => __( 'Upload or select the images used in the hero and gallery, then drag gallery items into order.', 'frankies-headless-cms' ),
			'frankies_headless_about'             => __( 'Heading, copy, and images for the About page.', 'frankies-headless-cms' ),
			'frankies_headless_locations_page'    => __( 'Heading and intro copy for the Locations page.', 'frankies-headless-cms' ),
			'frankies_headless_menu_page_content' => __( 'Edit the global order link plus the visible text used on the menu pages.', 'frankies-headless-cms' ),
			'frankies_headless_press_page'        => __( 'Heading and intro text for the Press page.', 'frankies-headless-cms' ),
		);

		return $help[ $section_id ] ?? '';
	}

	public static function render_menu_section_help() {
		echo '<p>' . esc_html__( 'These fields are advanced fallback HTML only. The interactive menu builder is the primary editor. If menu sections exist, the website uses those instead of this raw markup.', 'frankies-headless-cms' ) . '</p>';
	}

	public static function render_setting_field( $args ) {
		$settings = wp_parse_args( get_option( self::OPTION_KEY, array() ), self::default_settings() );
		$key      = $args['key'];
		$type     = $args['type'];
		$value    = $settings[ $key ] ?? '';
		$name     = self::OPTION_KEY . '[' . $key . ']';

		if ( ! empty( $args['raw'] ) ) {
			echo '<textarea name="' . esc_attr( $name ) . '" rows="' . absint( $args['rows'] ) . '" class="large-text code" spellcheck="false" style="min-height:420px;font-family:Consolas,Monaco,monospace;">' . esc_textarea( $value ) . '</textarea>';
		} elseif ( 'media' === $type ) {
			self::render_media_field( $name, $value, $args );
		} elseif ( 'gallery' === $type ) {
			self::render_gallery_field( $name, $value, $args );
		} elseif ( 'menu_builder' === $type ) {
			self::render_menu_builder_field( $name, $value );
		} elseif ( 'textarea' === $type ) {
			echo '<textarea name="' . esc_attr( $name ) . '" rows="' . absint( $args['rows'] ) . '" class="large-text" data-preview-key="' . esc_attr( $key ) . '" placeholder="' . esc_attr( $args['placeholder'] ) . '">' . esc_textarea( $value ) . '</textarea>';
		} else {
			$input_class = in_array( $type, array( 'url', 'email' ), true ) ? 'regular-text code' : 'regular-text';
			echo '<input type="' . esc_attr( $type ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '" class="' . esc_attr( $input_class ) . '" data-preview-key="' . esc_attr( $key ) . '" placeholder="' . esc_attr( $args['placeholder'] ) . '" />';
		}

		if ( ! empty( $args['help'] ) ) {
			echo '<p class="description">' . esc_html( $args['help'] ) . '</p>';
		}

		if ( ! empty( $args['preview'] ) && ! empty( $value ) && ! in_array( $type, array( 'media', 'gallery' ), true ) ) {
			echo '<p style="margin-top:10px;"><img src="' . esc_url( $value ) . '" alt="" style="display:block;max-width:240px;max-height:180px;border:1px solid #dcdcde;border-radius:6px;background:#f6f7f7;padding:4px;object-fit:cover;" /></p>';
		}
	}

	public static function render_settings_page() {
		$pages = self::page_editor_configs();

		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'Site Pages', 'frankies-headless-cms' ) . '</h1>';
		echo '<p>' . esc_html__( 'Open a page below. Each page editor contains only that page’s fields, including text, images, links, and exact page markup.', 'frankies-headless-cms' ) . '</p>';
		echo '<div class="fb-exact-pages-card">';
		echo '<div class="fb-exact-pages-card__header">';
		echo '<h2>' . esc_html__( 'Page List', 'frankies-headless-cms' ) . '</h2>';
		echo '<p>' . esc_html__( 'Select the exact frontend page you want to edit.', 'frankies-headless-cms' ) . '</p>';
		echo '</div>';
		echo '<div class="fb-exact-pages-grid">';
		foreach ( $pages as $page ) {
			echo '<article class="fb-exact-page-tile">';
			echo '<h3>' . esc_html( $page['title'] ) . '</h3>';
			echo '<p>' . esc_html( $page['description'] ) . '</p>';
			echo '<p><a class="button button-secondary" href="' . esc_url( admin_url( 'admin.php?page=' . $page['menu_slug'] ) ) . '">' . esc_html__( 'Edit Page', 'frankies-headless-cms' ) . '</a></p>';
			echo '</article>';
		}
		echo '</div>';
		echo '</div>';
		echo '</div>';
	}

	public static function render_home_page() {
		$settings = wp_parse_args( get_option( self::OPTION_KEY, array() ), self::default_settings() );
		$sections = array(
			'frankies_headless_branding'    => __( 'Branding', 'frankies-headless-cms' ),
			'frankies_headless_home_hero'   => __( 'Hero Content', 'frankies-headless-cms' ),
			'frankies_headless_home_menu'   => __( 'Buttons And Footer', 'frankies-headless-cms' ),
			'frankies_headless_home_images' => __( 'Images And Gallery', 'frankies-headless-cms' ),
		);

		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'Home Content', 'frankies-headless-cms' ) . '</h1>';
		echo '<p>' . esc_html__( 'Edit the homepage with a better admin layout. The preview updates as you type so you can see every major section at once.', 'frankies-headless-cms' ) . '</p>';
		echo '<form method="post" action="options.php" class="fb-home-editor">';
		settings_fields( 'frankies_headless_group' );
		echo '<div class="fb-home-layout">';
		echo '<div class="fb-home-layout__form">';

		foreach ( $sections as $section_id => $label ) {
			self::render_settings_section_card( $section_id, $label );
		}

		submit_button();
		echo '</div>';
		self::render_home_preview_panel( $settings );
		echo '</div>';
		echo '</form>';
		echo '</div>';
	}

	public static function render_page_editors_page() {
		$configs       = self::page_editor_configs();
		$current_page  = self::current_page_editor_config( $configs );

		if ( ! $current_page ) {
			return;
		}

		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'Page Editors', 'frankies-headless-cms' ) . '</h1>';
		echo '<p>' . esc_html__( 'Select a page below. Each page editor contains all available fields for that page so you can update text, images, links, and exact main markup without changing the frontend design.', 'frankies-headless-cms' ) . '</p>';
		self::render_page_editor_tabs( $configs, $current_page['route'] );
		echo '<form method="post" action="options.php">';
		settings_fields( 'frankies_headless_group' );
		echo '<div class="fb-page-editor-layout">';
		echo '<div class="fb-page-editor-layout__main">';
		echo '<section class="fb-editor-card fb-editor-card--stacked">';
		echo '<div class="fb-editor-card__header">';
		echo '<h2>' . esc_html( $current_page['title'] ) . '</h2>';
		echo '<p>' . esc_html( $current_page['description'] ) . '</p>';
		echo '</div>';

		foreach ( $current_page['field_groups'] as $group ) {
			echo '<div class="fb-section-group">';
			echo '<h3 class="fb-section-group__title">' . esc_html( $group['label'] ) . '</h3>';
			if ( ! empty( $group['description'] ) ) {
				echo '<p>' . esc_html( $group['description'] ) . '</p>';
			}
			self::render_settings_fields_by_keys( $group['fields'] );
			echo '</div>';
		}

		echo '</section>';
		submit_button( sprintf( __( 'Save %s', 'frankies-headless-cms' ), $current_page['title'] ) );
		echo '</div>';
		echo '</div>';
		echo '</form>';
		echo '</div>';
	}

	private static function render_settings_section_card( $section_id, $label ) {
		echo '<section class="fb-editor-card">';
		echo '<div class="fb-editor-card__header">';
		echo '<h2>' . esc_html( $label ) . '</h2>';
		$help = self::section_help_text( $section_id );
		if ( $help ) {
			echo '<p>' . esc_html( $help ) . '</p>';
		}
		echo '</div>';

		foreach ( self::settings_fields() as $field_key => $field ) {
			if ( ( $field['section'] ?? '' ) !== $section_id ) {
				continue;
			}

			echo '<div class="fb-editor-field">';
			echo '<label class="fb-editor-field__label" for="' . esc_attr( $field_key ) . '">' . esc_html( $field['label'] ) . '</label>';
			self::render_setting_field(
				array(
					'key'         => $field_key,
					'type'        => $field['type'],
					'rows'        => $field['rows'] ?? 4,
					'help'        => $field['help'] ?? '',
					'raw'         => ! empty( $field['raw'] ),
					'placeholder' => $field['placeholder'] ?? '',
					'preview'     => ! empty( $field['preview'] ),
				)
			);
			echo '</div>';
		}

		echo '</section>';
	}

	private static function render_settings_fields_by_keys( $field_keys ) {
		$fields = self::settings_fields();

		foreach ( $field_keys as $field_key ) {
			if ( empty( $fields[ $field_key ] ) ) {
				continue;
			}

			$field = $fields[ $field_key ];

			echo '<div class="fb-editor-field">';
			echo '<label class="fb-editor-field__label" for="' . esc_attr( $field_key ) . '">' . esc_html( $field['label'] ) . '</label>';
			self::render_setting_field(
				array(
					'key'         => $field_key,
					'type'        => $field['type'],
					'rows'        => $field['rows'] ?? 4,
					'help'        => $field['help'] ?? '',
					'raw'         => ! empty( $field['raw'] ),
					'placeholder' => $field['placeholder'] ?? '',
					'preview'     => ! empty( $field['preview'] ),
				)
			);
			echo '</div>';
		}
	}

	private static function render_settings_group_card( $title, $description, $sections ) {
		echo '<section class="fb-editor-card fb-editor-card--stacked">';
		echo '<div class="fb-editor-card__header">';
		echo '<h2>' . esc_html( $title ) . '</h2>';
		echo '<p>' . esc_html( $description ) . '</p>';
		echo '</div>';

		foreach ( $sections as $section_id ) {
			$section_label = self::section_label( $section_id );

			if ( ! $section_label ) {
				continue;
			}

			echo '<div class="fb-section-group">';
			echo '<h3 class="fb-section-group__title">' . esc_html( $section_label ) . '</h3>';
			self::render_settings_section_fields( $section_id );
			echo '</div>';
		}

		echo '</section>';
	}

	private static function render_settings_section_fields( $section_id ) {
		foreach ( self::settings_fields() as $field_key => $field ) {
			if ( ( $field['section'] ?? '' ) !== $section_id ) {
				continue;
			}

			echo '<div class="fb-editor-field">';
			echo '<label class="fb-editor-field__label" for="' . esc_attr( $field_key ) . '">' . esc_html( $field['label'] ) . '</label>';
			self::render_setting_field(
				array(
					'key'         => $field_key,
					'type'        => $field['type'],
					'rows'        => $field['rows'] ?? 4,
					'help'        => $field['help'] ?? '',
					'raw'         => ! empty( $field['raw'] ),
					'placeholder' => $field['placeholder'] ?? '',
					'preview'     => ! empty( $field['preview'] ),
				)
			);
			echo '</div>';
		}
	}

	private static function render_page_editor_sidebar( $current_page, $settings ) {
		echo '<section class="fb-editor-card">';
		echo '<div class="fb-editor-card__header">';
		echo '<h2>' . esc_html__( 'Page Tools', 'frankies-headless-cms' ) . '</h2>';
		echo '<p>' . esc_html__( 'Open the live route or go back to the page list. This editor contains only the current page content.', 'frankies-headless-cms' ) . '</p>';
		echo '</div>';
		echo '<div class="fb-quick-links">';
		echo '<a class="button button-primary" href="' . esc_url( $current_page['preview_url'] ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Open Live Page', 'frankies-headless-cms' ) . '</a>';
		echo '<a class="button button-secondary" href="' . esc_url( admin_url( 'admin.php?page=frankies-headless-content' ) ) . '">' . esc_html__( 'All Pages', 'frankies-headless-cms' ) . '</a>';
		echo '</div>';
		echo '</section>';

		if ( 'home' === $current_page['route'] ) {
			self::render_home_preview_panel( $settings );
		}
	}

	private static function render_page_editor_tabs( $configs, $active_route ) {
		echo '<nav class="fb-page-editor-tabs" aria-label="' . esc_attr__( 'Page editors', 'frankies-headless-cms' ) . '">';
		foreach ( $configs as $route => $page ) {
			$class = $route === $active_route ? 'fb-page-editor-tab fb-page-editor-tab--active' : 'fb-page-editor-tab';
			echo '<a class="' . esc_attr( $class ) . '" href="' . esc_url( admin_url( 'admin.php?page=' . $page['menu_slug'] ) ) . '">' . esc_html( $page['title'] ) . '</a>';
		}
		echo '</nav>';
	}

	private static function current_page_editor_config( $configs ) {
		$current_slug  = sanitize_key( wp_unslash( $_GET['page'] ?? '' ) );
		$current_route = sanitize_key( wp_unslash( $_GET['route'] ?? '' ) );

		foreach ( $configs as $config ) {
			if ( ! empty( $config['menu_slug'] ) && $config['menu_slug'] === $current_slug ) {
				return $config;
			}
		}

		if ( $current_route && isset( $configs[ $current_route ] ) ) {
			return $configs[ $current_route ];
		}

		return reset( $configs );
	}

	private static function section_label( $section_id ) {
		$labels = array(
			'frankies_headless_branding'          => __( 'Branding', 'frankies-headless-cms' ),
			'frankies_headless_home_hero'         => __( 'Homepage Hero', 'frankies-headless-cms' ),
			'frankies_headless_home_menu'         => __( 'Buttons And Footer', 'frankies-headless-cms' ),
			'frankies_headless_home_images'       => __( 'Homepage Images', 'frankies-headless-cms' ),
			'frankies_headless_about'             => __( 'About Page', 'frankies-headless-cms' ),
			'frankies_headless_locations_page'    => __( 'Locations Page', 'frankies-headless-cms' ),
			'frankies_headless_press_page'        => __( 'Press Page', 'frankies-headless-cms' ),
			'frankies_headless_menu_page_content' => __( 'Menu Page Content', 'frankies-headless-cms' ),
		);

		return $labels[ $section_id ] ?? '';
	}

	private static function page_editor_configs() {
		return array(
			'home' => array(
				'route'       => 'home',
				'menu_slug'   => 'frankies-headless-page-home',
				'title'       => __( 'Home', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the homepage route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'       => __( 'Home Content', 'frankies-headless-cms' ),
						'description' => __( 'Only the editable text and links used on the home page.', 'frankies-headless-cms' ),
						'fields'      => array(
							'brand_name',
							'hero_title',
							'hero_copy',
							'secret_sauce_title',
							'secret_sauce_copy',
							'follow_label',
							'instagram_url',
							'footer_note',
						),
					),
					array(
						'label'       => __( 'Home Images', 'frankies-headless-cms' ),
						'description' => __( 'Image fields used by the home page hero, skull graphic, and gallery.', 'frankies-headless-cms' ),
						'fields'      => array(
							'logo_image',
							'hero_left_image',
							'hero_center_image',
							'hero_right_image',
							'skull_image',
							'gallery_images',
						),
					),
				),
				'markup_field' => 'home_main_markup',
				'markup_label' => __( 'Home page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/' ),
			),
			'about' => array(
				'route'       => 'about',
				'menu_slug'   => 'frankies-headless-page-about',
				'title'       => __( 'About', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the About route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'       => __( 'About Content', 'frankies-headless-cms' ),
						'description' => __( 'Exact text fields shown on the About page.', 'frankies-headless-cms' ),
						'fields'      => array(
							'about_title',
							'about_copy',
						),
					),
					array(
						'label'       => __( 'About Images', 'frankies-headless-cms' ),
						'description' => __( 'All editable About page images in page order.', 'frankies-headless-cms' ),
						'fields'      => array(
							'about_banner_image',
							'about_portrait_image',
							'about_secondary_image',
							'about_primary_image',
						),
					),
				),
				'markup_field' => 'about_main_markup',
				'markup_label' => __( 'About page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/about' ),
			),
			'locations' => array(
				'route'       => 'locations',
				'menu_slug'   => 'frankies-headless-page-locations',
				'title'       => __( 'Locations', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the Locations route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'  => __( 'Locations Page', 'frankies-headless-cms' ),
						'fields' => array(
							'locations_title',
							'locations_copy',
							'locations_miami_image',
							'locations_hallandale_image',
						),
					),
				),
				'markup_field' => 'locations_main_markup',
				'markup_label' => __( 'Locations page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/locations' ),
			),
			'press' => array(
				'route'       => 'press',
				'menu_slug'   => 'frankies-headless-page-press',
				'title'       => __( 'Press', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the Press route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'       => __( 'Press Intro', 'frankies-headless-cms' ),
						'description' => __( 'Page heading and intro text for the press page.', 'frankies-headless-cms' ),
						'fields'      => array(
							'press_title',
							'press_copy',
						),
					),
					array(
						'label'       => __( 'Press Card 1', 'frankies-headless-cms' ),
						'description' => __( 'First press card image, outlet, title, and link.', 'frankies-headless-cms' ),
						'fields'      => array(
							'press_item_1_image',
							'press_item_1_outlet',
							'press_item_1_title',
							'press_item_1_url',
						),
					),
					array(
						'label'       => __( 'Press Card 2', 'frankies-headless-cms' ),
						'description' => __( 'Second press card image, outlet, title, and link.', 'frankies-headless-cms' ),
						'fields'      => array(
							'press_item_2_image',
							'press_item_2_outlet',
							'press_item_2_title',
							'press_item_2_url',
						),
					),
					array(
						'label'       => __( 'Press Card 3', 'frankies-headless-cms' ),
						'description' => __( 'Third press card image, outlet, title, and link.', 'frankies-headless-cms' ),
						'fields'      => array(
							'press_item_3_image',
							'press_item_3_outlet',
							'press_item_3_title',
							'press_item_3_url',
						),
					),
					array(
						'label'       => __( 'Press Card 4', 'frankies-headless-cms' ),
						'description' => __( 'Fourth press card image, outlet, title, and link.', 'frankies-headless-cms' ),
						'fields'      => array(
							'press_item_4_image',
							'press_item_4_outlet',
							'press_item_4_title',
							'press_item_4_url',
						),
					),
				),
				'markup_field' => 'press_main_markup',
				'markup_label' => __( 'Press page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/press' ),
			),
			'mimo' => array(
				'route'       => 'mimo',
				'menu_slug'   => 'frankies-headless-page-mimo',
				'title'       => __( 'Miami Location', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the Miami location route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'  => __( 'Miami Location Content', 'frankies-headless-cms' ),
						'fields' => array(
							'miami_label',
							'hours_heading',
						),
					),
				),
				'markup_field' => 'mimo_main_markup',
				'markup_label' => __( 'Miami location page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/mimo' ),
			),
			'hallandale' => array(
				'route'       => 'hallandale',
				'menu_slug'   => 'frankies-headless-page-hallandale',
				'title'       => __( 'Hallandale Location', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the Hallandale location route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'  => __( 'Hallandale Content', 'frankies-headless-cms' ),
						'fields' => array(
							'hallandale_label',
							'hallandale_subtitle',
							'hours_heading',
							'happy_hour_heading',
							'hallandale_happy_hour_copy',
						),
					),
				),
				'markup_field' => 'hallandale_main_markup',
				'markup_label' => __( 'Hallandale page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/hallandale' ),
			),
			'miamimenu' => array(
				'route'       => 'miamimenu',
				'menu_slug'   => 'frankies-headless-page-miamimenu',
				'title'       => __( 'Miami Menu', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the Miami menu route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'  => __( 'Miami Menu Content', 'frankies-headless-cms' ),
						'fields' => array(
							'menu_page_title',
							'menu_page_brand',
							'miami_menu_sections',
						),
					),
				),
				'markup_field' => 'miami_menu_markup',
				'markup_label' => __( 'Miami menu page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/miamimenu' ),
			),
			'hallandalemenu' => array(
				'route'       => 'hallandalemenu',
				'menu_slug'   => 'frankies-headless-page-hallandalemenu',
				'title'       => __( 'Hallandale Menu', 'frankies-headless-cms' ),
				'description' => __( 'Main content for the Hallandale menu route.', 'frankies-headless-cms' ),
				'field_groups' => array(
					array(
						'label'  => __( 'Hallandale Menu Content', 'frankies-headless-cms' ),
						'fields' => array(
							'menu_page_title',
							'menu_page_brand',
							'hallandale_menu_sections',
						),
					),
				),
				'markup_field' => 'hallandale_menu_markup',
				'markup_label' => __( 'Hallandale menu page exact markup', 'frankies-headless-cms' ),
				'preview_url' => home_url( '/hallandalemenu' ),
			),
		);
	}

	private static function render_home_preview_panel( $settings ) {
		$gallery = self::explode_lines( $settings['gallery_images'] ?? '' );

		echo '<aside class="fb-home-preview">';
		echo '<div class="fb-home-preview__sticky">';
		echo '<div class="fb-home-preview__frame">';
		echo '<p class="fb-home-preview__eyebrow">' . esc_html__( 'Live Preview', 'frankies-headless-cms' ) . '</p>';
		echo '<div class="fb-home-preview__logo-wrap">';
		echo '<img class="fb-home-preview__logo" src="' . esc_url( $settings['logo_image'] ?? '' ) . '" alt="" data-preview-image="logo_image" ' . ( empty( $settings['logo_image'] ) ? 'hidden' : '' ) . ' />';
		echo '</div>';
		echo '<h2 class="fb-home-preview__brand" data-preview-target="brand_name">' . esc_html( $settings['brand_name'] ) . '</h2>';
		echo '<h3 class="fb-home-preview__title" data-preview-target="hero_title">' . esc_html( $settings['hero_title'] ) . '</h3>';
		echo '<p class="fb-home-preview__copy" data-preview-target="hero_copy">' . esc_html( $settings['hero_copy'] ) . '</p>';
		echo '<div class="fb-home-preview__actions">';
		echo '<a href="#" class="button button-primary" data-preview-target="menu_primary_label">' . esc_html( $settings['menu_primary_label'] ) . '</a>';
		echo '<a href="#" class="button" data-preview-target="menu_secondary_label">' . esc_html( $settings['menu_secondary_label'] ) . '</a>';
		echo '</div>';
		echo '<div class="fb-home-preview__hero-images">';
		echo '<img src="' . esc_url( $settings['hero_left_image'] ) . '" alt="" data-preview-image="hero_left_image" />';
		echo '<img src="' . esc_url( $settings['hero_center_image'] ) . '" alt="" data-preview-image="hero_center_image" />';
		echo '<img src="' . esc_url( $settings['hero_right_image'] ) . '" alt="" data-preview-image="hero_right_image" />';
		echo '</div>';
		echo '<div class="fb-home-preview__story">';
		echo '<img src="' . esc_url( $settings['skull_image'] ) . '" alt="" data-preview-image="skull_image" />';
		echo '<div>';
		echo '<h4 data-preview-target="secret_sauce_title">' . esc_html( $settings['secret_sauce_title'] ) . '</h4>';
		echo '<p data-preview-target="secret_sauce_copy">' . esc_html( $settings['secret_sauce_copy'] ) . '</p>';
		echo '</div>';
		echo '</div>';
		echo '<div class="fb-home-preview__gallery" data-preview-gallery="gallery_images">';
		foreach ( $gallery as $image ) {
			echo '<img src="' . esc_url( $image ) . '" alt="" />';
		}
		echo '</div>';
		echo '<p class="fb-home-preview__footer"><span data-preview-target="follow_label">' . esc_html( $settings['follow_label'] ) . '</span> &#183; <span data-preview-target="footer_note">' . esc_html( $settings['footer_note'] ) . '</span></p>';
		echo '</div>';
		echo '</div>';
		echo '</aside>';
	}

	public static function render_pages_page() {
		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'Pages Content', 'frankies-headless-cms' ) . '</h1>';
		echo '<p>' . esc_html__( 'Edit About, Locations, and Press page content here.', 'frankies-headless-cms' ) . '</p>';
		echo '<form method="post" action="options.php">';
		settings_fields( 'frankies_headless_group' );
		do_settings_sections( 'frankies-headless-pages' );
		submit_button();
		echo '</form>';
		echo '</div>';
	}

	public static function render_menu_pages_page() {
		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'Menu Pages', 'frankies-headless-cms' ) . '</h1>';
		echo '<p>' . esc_html__( 'Edit the visible menu-page content with the interactive builder here. Raw fallback markup stays in Advanced Markup only.', 'frankies-headless-cms' ) . '</p>';
		echo '<form method="post" action="options.php">';
		settings_fields( 'frankies_headless_group' );
		do_settings_sections( 'frankies-headless-menu-pages' );
		submit_button( __( 'Save Menu Pages', 'frankies-headless-cms' ) );
		echo '</form>';
		echo '</div>';
	}

	public static function render_markup_page() {
		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'Advanced Markup', 'frankies-headless-cms' ) . '</h1>';
		echo '<p>' . esc_html__( 'These fields contain raw cloned HTML for exact layout parity. Most editors should not change anything here.', 'frankies-headless-cms' ) . '</p>';
		echo '<form method="post" action="options.php">';
		settings_fields( 'frankies_headless_group' );
		do_settings_sections( 'frankies-headless-markup' );
		submit_button( __( 'Save Markup', 'frankies-headless-cms' ) );
		echo '</form>';
		echo '</div>';
	}

	public static function render_order_page() {
		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'Content Order', 'frankies-headless-cms' ) . '</h1>';
		echo '<p>' . esc_html__( 'Drag items within each column to control the order used on the website. Click Save Order when you are done.', 'frankies-headless-cms' ) . '</p>';
		echo '<div class="fb-order-board" data-nonce="' . esc_attr( wp_create_nonce( 'frankies_save_content_order' ) ) . '">';

		foreach ( self::managed_post_types() as $post_type => $label ) {
			$items = get_posts(
				array(
					'post_type'      => $post_type,
					'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
					'posts_per_page' => -1,
					'orderby'        => 'menu_order title',
					'order'          => 'ASC',
				)
			);

			echo '<section class="fb-order-column">';
			echo '<div class="fb-order-column__header">';
			echo '<h2>' . esc_html( $label ) . '</h2>';
			echo '<a class="button button-secondary" href="' . esc_url( admin_url( 'post-new.php?post_type=' . $post_type ) ) . '">' . esc_html__( 'Add New', 'frankies-headless-cms' ) . '</a>';
			echo '</div>';
			echo '<ul class="fb-sortable-list" data-post-type="' . esc_attr( $post_type ) . '">';

			if ( empty( $items ) ) {
				echo '<li class="fb-sortable-item fb-sortable-item--empty">' . esc_html__( 'No items yet.', 'frankies-headless-cms' ) . '</li>';
			} else {
				foreach ( $items as $item ) {
					echo '<li class="fb-sortable-item" data-post-id="' . esc_attr( (string) $item->ID ) . '">';
					echo '<span class="fb-sortable-item__handle" aria-hidden="true">&#8801;</span>';
					echo '<div class="fb-sortable-item__content">';
					echo '<strong>' . esc_html( $item->post_title ?: __( '(no title)', 'frankies-headless-cms' ) ) . '</strong>';
					echo '<span class="fb-sortable-item__meta">' . esc_html( ucfirst( $item->post_status ) ) . '</span>';
					echo '</div>';
					echo '<a class="button-link" href="' . esc_url( get_edit_post_link( $item->ID ) ) . '">' . esc_html__( 'Edit', 'frankies-headless-cms' ) . '</a>';
					echo '</li>';
				}
			}

			echo '</ul>';
			echo '</section>';
		}

		echo '</div>';
		echo '<p><button type="button" class="button button-primary button-hero" id="fb-save-order">' . esc_html__( 'Save Order', 'frankies-headless-cms' ) . '</button> <span id="fb-save-order-status" aria-live="polite"></span></p>';
		echo '</div>';
	}

	private static function settings_page_for_section( $section ) {
		if ( 'frankies_headless_menu_page_content' === $section ) {
			return 'frankies-headless-menu-pages';
		}

		if ( 'frankies_headless_menus' === $section ) {
			return 'frankies-headless-markup';
		}

		if ( in_array( $section, array( 'frankies_headless_about', 'frankies_headless_locations_page', 'frankies_headless_press_page' ), true ) ) {
			return 'frankies-headless-pages';
		}

		return 'frankies-headless-home';
	}

	private static function render_admin_card( $title, $description, $url ) {
		echo '<div style="background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">';
		echo '<h2 style="margin-top:0;">' . esc_html( $title ) . '</h2>';
		echo '<p style="min-height:54px;">' . esc_html( $description ) . '</p>';
		echo '<p><a class="button button-primary" href="' . esc_url( $url ) . '">' . esc_html__( 'Open', 'frankies-headless-cms' ) . '</a></p>';
		echo '</div>';
	}

	public static function testimonial_columns( $columns ) {
		unset( $columns['date'] );

		return array_merge(
			$columns,
			array(
				'fb_author' => __( 'Author', 'frankies-headless-cms' ),
				'fb_quote'  => __( 'Quote Preview', 'frankies-headless-cms' ),
				'menu_order'=> __( 'Order', 'frankies-headless-cms' ),
				'date'      => __( 'Date', 'frankies-headless-cms' ),
			)
		);
	}

	public static function render_testimonial_column( $column, $post_id ) {
		if ( 'fb_author' === $column ) {
			echo esc_html( get_post_meta( $post_id, '_fb_author', true ) );
		} elseif ( 'fb_quote' === $column ) {
			echo esc_html( wp_trim_words( wp_strip_all_tags( get_post_field( 'post_content', $post_id ) ), 16 ) );
		} elseif ( 'menu_order' === $column ) {
			echo esc_html( (string) get_post_field( 'menu_order', $post_id ) );
		}
	}

	public static function location_columns( $columns ) {
		unset( $columns['date'] );

		return array_merge(
			$columns,
			array(
				'fb_city'       => __( 'Area', 'frankies-headless-cms' ),
				'fb_menu_url'   => __( 'Menu Link', 'frankies-headless-cms' ),
				'fb_order_url'  => __( 'Order Link', 'frankies-headless-cms' ),
				'menu_order'    => __( 'Order', 'frankies-headless-cms' ),
				'date'          => __( 'Date', 'frankies-headless-cms' ),
			)
		);
	}

	public static function render_location_column( $column, $post_id ) {
		if ( 'fb_city' === $column ) {
			echo esc_html( get_post_meta( $post_id, '_fb_city', true ) );
		} elseif ( 'fb_menu_url' === $column ) {
			self::render_admin_link_preview( get_post_meta( $post_id, '_fb_menu_url', true ) );
		} elseif ( 'fb_order_url' === $column ) {
			self::render_admin_link_preview( get_post_meta( $post_id, '_fb_order_url', true ) );
		} elseif ( 'menu_order' === $column ) {
			echo esc_html( (string) get_post_field( 'menu_order', $post_id ) );
		}
	}

	public static function press_columns( $columns ) {
		unset( $columns['date'] );

		return array_merge(
			$columns,
			array(
				'fb_outlet' => __( 'Outlet', 'frankies-headless-cms' ),
				'fb_url'    => __( 'Article Link', 'frankies-headless-cms' ),
				'menu_order'=> __( 'Order', 'frankies-headless-cms' ),
				'date'      => __( 'Date', 'frankies-headless-cms' ),
			)
		);
	}

	public static function render_press_column( $column, $post_id ) {
		if ( 'fb_outlet' === $column ) {
			echo esc_html( get_post_meta( $post_id, '_fb_outlet', true ) );
		} elseif ( 'fb_url' === $column ) {
			self::render_admin_link_preview( get_post_meta( $post_id, '_fb_url', true ) );
		} elseif ( 'menu_order' === $column ) {
			echo esc_html( (string) get_post_field( 'menu_order', $post_id ) );
		}
	}

	private static function render_admin_link_preview( $url ) {
		if ( empty( $url ) ) {
			echo '&mdash;';
			return;
		}

		echo '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Open Link', 'frankies-headless-cms' ) . '</a>';
	}

	public static function sanitize_settings( $input ) {
		$defaults  = self::default_settings();
		$sanitized = array();

		foreach ( self::settings_fields() as $key => $field ) {
			$value = $input[ $key ] ?? $defaults[ $key ];
			if ( ! empty( $field['raw'] ) ) {
				$sanitized[ $key ] = trim( wp_unslash( $value ) );
			} elseif ( 'gallery' === $field['type'] ) {
				$items = is_array( $value ) ? $value : preg_split( '/\r\n|\r|\n/', (string) $value );
				$items = array_filter(
					array_map(
						static function ( $item ) {
							return esc_url_raw( trim( wp_unslash( $item ) ) );
						},
						(array) $items
					)
				);
				$sanitized[ $key ] = implode( "\n", $items );
			} elseif ( 'menu_builder' === $field['type'] ) {
				$sanitized[ $key ] = wp_json_encode( self::sanitize_menu_sections( $value ) );
			} elseif ( 'media' === $field['type'] || in_array( $field['type'], array( 'url', 'email' ), true ) ) {
				$sanitized[ $key ] = esc_url_raw( $value );
			} elseif ( 'textarea' === $field['type'] ) {
				$sanitized[ $key ] = trim( wp_kses_post( $value ) );
			} else {
				$sanitized[ $key ] = sanitize_text_field( $value );
			}
		}

		return $sanitized;
	}

	public static function register_rest_routes() {
		register_rest_route(
			'frankies-headless/v1',
			'/site',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'rest_site_payload' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public static function rest_site_payload() {
		$settings = wp_parse_args( get_option( self::OPTION_KEY, array() ), self::default_settings() );

		$payload = array(
			'settings'     => array_merge(
				$settings,
				array(
					'gallery_images' => self::explode_lines( $settings['gallery_images'] ),
					'miami_menu_sections' => self::decode_menu_sections( $settings['miami_menu_sections'] ?? '[]' ),
					'hallandale_menu_sections' => self::decode_menu_sections( $settings['hallandale_menu_sections'] ?? '[]' ),
					'nav_items'      => array(
						array( 'label' => 'HOME', 'slug' => '/' ),
						array( 'label' => 'ABOUT', 'slug' => '/about' ),
						array( 'label' => 'LOCATIONS', 'slug' => '/locations' ),
						array( 'label' => 'PRESS', 'slug' => '/press' ),
					),
				)
			),
			'testimonials' => self::collect_testimonials(),
			'locations'    => self::collect_locations(),
			'press_items'  => self::collect_press_items(),
		);

		return rest_ensure_response( self::normalize_asset_urls( $payload ) );
	}

	private static function normalize_asset_urls( $value ) {
		if ( is_array( $value ) ) {
			foreach ( $value as $key => $item ) {
				$value[ $key ] = self::normalize_asset_urls( $item );
			}

			return $value;
		}

		if ( ! is_string( $value ) || '' === $value ) {
			return $value;
		}

		if ( preg_match( '#^https?://localhost(?::\d+)?/#i', $value ) ) {
			return $value;
		}

		$site_host    = wp_parse_url( site_url(), PHP_URL_HOST );
		$parsed_host  = wp_parse_url( $value, PHP_URL_HOST );
		$parsed_path  = wp_parse_url( $value, PHP_URL_PATH );
		$parsed_query = wp_parse_url( $value, PHP_URL_QUERY );

		if ( empty( $parsed_host ) || empty( $parsed_path ) ) {
			return $value;
		}

		if ( $site_host && $parsed_host !== $site_host ) {
			return $value;
		}

		if ( 0 !== strpos( $parsed_path, '/wp-content/' ) && 0 !== strpos( $parsed_path, '/wp-includes/' ) && 0 !== strpos( $parsed_path, '/wp-admin/' ) ) {
			return $value;
		}

		return $parsed_path . ( $parsed_query ? '?' . $parsed_query : '' );
	}

	private static function collect_testimonials() {
		$posts = get_posts(
			array(
				'post_type'      => 'fb_testimonial',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'menu_order title',
				'order'          => 'ASC',
			)
		);

		if ( empty( $posts ) ) {
			return array_map(
				static function ( $testimonial ) {
					return array(
						'id'             => 0,
						'quote'          => $testimonial['content'],
						'author'         => $testimonial['author'],
						'title'          => $testimonial['title'],
						'featured_image' => '',
					);
				},
				self::default_testimonials()
			);
		}

		return array_map(
			static function ( $post ) {
				return array(
					'id'             => $post->ID,
					'quote'          => wp_strip_all_tags( apply_filters( 'the_content', $post->post_content ) ),
					'author'         => get_post_meta( $post->ID, '_fb_author', true ),
					'title'          => $post->post_title,
					'featured_image' => get_the_post_thumbnail_url( $post->ID, 'large' ) ?: '',
				);
			},
			$posts
		);
	}

	private static function default_testimonials() {
		return array(
			array(
				'title'   => 'Alex Orchilles',
				'author'  => 'Alex Orchilles',
				'content' => "Say it with me now, we're not here for the atmosphere, we're here for birria tacos, steak burritos, and churros! This spot on extremely busy Biscayne is the authentic taco spot that we all needed down here. I've eaten here twice since I discovered it a few weeks ago and I'm already thinking of my next visit.\n\nThe caesar salad with chicken is amazing which is something I rarely say at Mexican spots. Anyways I highly recommend you come check this place out if you haven't!",
			),
			array(
				'title'   => 'Mary Ellen Carrillo',
				'author'  => 'Mary Ellen Carrillo',
				'content' => "Wowowow! I am pleased to find a place in Miami where they focus on the food and not just atmosphere. This place has it all! Everything we had was amazing. What I loved the most was the shrimp. Yes for Uptown 66!! Prices are super decent too for the food it's so worth it. See you soon uptown.",
			),
			array(
				'title'   => 'Sandy Cheng',
				'author'  => 'Sandy Cheng',
				'content' => 'Found this little spot when we were craving tacos. Saw the great reviews and decided to check it out for myself. Boy do I not regret it. Such delicious food! Perfect portion sizes. The service was great and very attentive. We ordered birria, flautas, barbacoa, mushroom and flan. Delicious delicious delicious. Check it out for yourself!',
			),
		);
	}

	private static function collect_locations() {
		$posts = get_posts(
			array(
				'post_type'      => 'fb_location',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'menu_order title',
				'order'          => 'ASC',
			)
		);

		return array_map(
			static function ( $post ) {
				return array(
					'id'             => $post->ID,
					'name'           => $post->post_title,
					'copy'           => wp_strip_all_tags( apply_filters( 'the_content', $post->post_content ) ),
					'address'        => get_post_meta( $post->ID, '_fb_address', true ),
					'city'           => get_post_meta( $post->ID, '_fb_city', true ),
					'menu_url'       => get_post_meta( $post->ID, '_fb_menu_url', true ),
					'order_url'      => get_post_meta( $post->ID, '_fb_order_url', true ),
					'hours'          => get_post_meta( $post->ID, '_fb_hours', true ),
					'phone'          => get_post_meta( $post->ID, '_fb_phone', true ),
					'featured_image' => get_the_post_thumbnail_url( $post->ID, 'large' ) ?: '',
				);
			},
			$posts
		);
	}

	private static function collect_press_items() {
		$override_items = self::press_items_from_settings();

		if ( ! empty( $override_items ) ) {
			return $override_items;
		}

		$posts = get_posts(
			array(
				'post_type'      => 'fb_press_item',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'menu_order title',
				'order'          => 'ASC',
			)
		);

		return array_map(
			static function ( $post ) {
				return array(
					'id'             => $post->ID,
					'title'          => $post->post_title,
					'excerpt'        => wp_strip_all_tags( apply_filters( 'the_content', $post->post_content ) ),
					'outlet'         => get_post_meta( $post->ID, '_fb_outlet', true ),
					'external_url'   => get_post_meta( $post->ID, '_fb_url', true ),
					'featured_image' => get_the_post_thumbnail_url( $post->ID, 'large' ) ?: '',
				);
			},
			$posts
		);
	}

	private static function press_items_from_settings() {
		$settings = wp_parse_args( get_option( self::OPTION_KEY, array() ), self::default_settings() );
		$items    = array();

		for ( $index = 1; $index <= 4; $index++ ) {
			$item = array(
				'id'             => 'press-option-' . $index,
				'title'          => $settings[ 'press_item_' . $index . '_title' ] ?? '',
				'excerpt'        => '',
				'outlet'         => $settings[ 'press_item_' . $index . '_outlet' ] ?? '',
				'external_url'   => $settings[ 'press_item_' . $index . '_url' ] ?? '',
				'featured_image' => $settings[ 'press_item_' . $index . '_image' ] ?? '',
			);

			if ( $item['title'] || $item['outlet'] || $item['external_url'] || $item['featured_image'] ) {
				$items[] = $item;
			}
		}

		return $items;
	}

	private static function explode_lines( $value ) {
		return array_values(
			array_filter(
				array_map( 'trim', preg_split( '/\r\n|\r|\n/', (string) $value ) )
			)
		);
	}

	private static function managed_post_types() {
		return array(
			'fb_testimonial' => __( 'Testimonials', 'frankies-headless-cms' ),
			'fb_location'    => __( 'Locations', 'frankies-headless-cms' ),
			'fb_press_item'  => __( 'Press Items', 'frankies-headless-cms' ),
		);
	}

	private static function render_media_field( $name, $value, $args ) {
		$has_image = ! empty( $value );

		echo '<div class="fb-media-field" data-preview-key="' . esc_attr( $args['key'] ) . '" data-placeholder="' . esc_attr__( 'No image selected', 'frankies-headless-cms' ) . '">';
		echo '<div class="fb-media-field__preview"' . ( $has_image ? '' : ' hidden' ) . '>';
		echo '<img src="' . esc_url( $value ) . '" alt="" />';
		echo '</div>';
		echo '<div class="fb-media-field__controls">';
		echo '<input type="url" name="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '" class="regular-text code fb-media-field__input" placeholder="' . esc_attr( $args['placeholder'] ) . '" />';
		echo '<p><button type="button" class="button fb-media-upload">' . esc_html__( 'Upload / Select Image', 'frankies-headless-cms' ) . '</button> <button type="button" class="button-link-delete fb-media-remove"' . ( $has_image ? '' : ' hidden' ) . '>' . esc_html__( 'Remove', 'frankies-headless-cms' ) . '</button></p>';
		echo '</div>';
		echo '</div>';
	}

	private static function render_gallery_field( $name, $value, $args ) {
		$items = self::explode_lines( is_array( $value ) ? implode( "\n", $value ) : (string) $value );

		echo '<div class="fb-gallery-field" data-preview-key="' . esc_attr( $args['key'] ) . '" data-input-name="' . esc_attr( $name ) . '">';
		echo '<ul class="fb-gallery-field__list">';

		foreach ( $items as $item ) {
			self::render_gallery_item( $name, $item );
		}

		echo '</ul>';
		echo '<p class="fb-gallery-field__actions"><button type="button" class="button button-secondary fb-gallery-add">' . esc_html__( 'Add Images', 'frankies-headless-cms' ) . '</button></p>';
		echo '</div>';
	}

	private static function render_gallery_item( $name, $url = '' ) {
		echo '<li class="fb-gallery-item">';
		echo '<span class="fb-gallery-item__handle" aria-hidden="true">&#8801;</span>';
		echo '<div class="fb-gallery-item__preview"' . ( $url ? '' : ' hidden' ) . '><img src="' . esc_url( $url ) . '" alt="" /></div>';
		echo '<input type="hidden" class="fb-gallery-item__input" name="' . esc_attr( $name ) . '[]" value="' . esc_attr( $url ) . '" />';
		echo '<div class="fb-gallery-item__meta">';
		echo '<span class="fb-gallery-item__url">' . esc_html( $url ) . '</span>';
		echo '<div class="fb-gallery-item__buttons"><button type="button" class="button button-small fb-gallery-replace">' . esc_html__( 'Replace', 'frankies-headless-cms' ) . '</button> <button type="button" class="button-link-delete fb-gallery-remove">' . esc_html__( 'Remove', 'frankies-headless-cms' ) . '</button></div>';
		echo '</div>';
		echo '</li>';
	}

	private static function render_menu_builder_field( $name, $value ) {
		$sections = self::decode_menu_sections( $value );

		echo '<div class="fb-menu-builder">';
		echo '<input type="hidden" class="fb-menu-builder__input" name="' . esc_attr( $name ) . '" value="' . esc_attr( wp_json_encode( $sections ) ) . '" />';
		echo '<div class="fb-menu-builder__sections">';

		foreach ( $sections as $section ) {
			self::render_menu_builder_section( $section );
		}

		echo '</div>';
		echo '<p><button type="button" class="button button-secondary fb-menu-builder-add-section">' . esc_html__( 'Add Section', 'frankies-headless-cms' ) . '</button></p>';
		echo '<p class="description">' . esc_html__( 'Add menu sections and items here. Drag sections and items to reorder them.', 'frankies-headless-cms' ) . '</p>';
		echo '</div>';
	}

	private static function render_menu_builder_section( $section ) {
		$title = $section['title'] ?? '';
		$items = $section['items'] ?? array();

		echo '<div class="fb-menu-section">';
		echo '<div class="fb-menu-section__header">';
		echo '<span class="fb-menu-section__handle" aria-hidden="true">&#8801;</span>';
		echo '<input type="text" class="regular-text fb-menu-section__title" value="' . esc_attr( $title ) . '" placeholder="' . esc_attr__( 'Section title', 'frankies-headless-cms' ) . '" />';
		echo '<button type="button" class="button-link-delete fb-menu-section-remove">' . esc_html__( 'Remove Section', 'frankies-headless-cms' ) . '</button>';
		echo '</div>';
		echo '<div class="fb-menu-section__items">';

		foreach ( $items as $item ) {
			self::render_menu_builder_item( $item );
		}

		echo '</div>';
		echo '<p><button type="button" class="button button-small fb-menu-builder-add-item">' . esc_html__( 'Add Item', 'frankies-headless-cms' ) . '</button></p>';
		echo '</div>';
	}

	private static function render_menu_builder_item( $item ) {
		echo '<div class="fb-menu-item">';
		echo '<span class="fb-menu-item__handle" aria-hidden="true">&#8801;</span>';
		echo '<input type="text" class="fb-menu-item__name" value="' . esc_attr( $item['name'] ?? '' ) . '" placeholder="' . esc_attr__( 'Item name', 'frankies-headless-cms' ) . '" />';
		echo '<input type="text" class="fb-menu-item__price" value="' . esc_attr( $item['price'] ?? '' ) . '" placeholder="' . esc_attr__( 'Price', 'frankies-headless-cms' ) . '" />';
		echo '<textarea class="fb-menu-item__description" rows="2" placeholder="' . esc_attr__( 'Description', 'frankies-headless-cms' ) . '">' . esc_textarea( $item['description'] ?? '' ) . '</textarea>';
		echo '<button type="button" class="button-link-delete fb-menu-item-remove">' . esc_html__( 'Remove', 'frankies-headless-cms' ) . '</button>';
		echo '</div>';
	}

	private static function decode_menu_sections( $value ) {
		if ( is_array( $value ) ) {
			return self::sanitize_menu_sections( $value );
		}

		$decoded = json_decode( (string) $value, true );

		if ( ! is_array( $decoded ) ) {
			return array();
		}

		return self::sanitize_menu_sections( $decoded );
	}

	private static function sanitize_menu_sections( $value ) {
		if ( is_string( $value ) ) {
			$value = json_decode( wp_unslash( $value ), true );
		}

		if ( ! is_array( $value ) ) {
			return array();
		}

		$sections = array();

		foreach ( $value as $section ) {
			$title = sanitize_text_field( $section['title'] ?? '' );
			$items = array();

			if ( ! empty( $section['items'] ) && is_array( $section['items'] ) ) {
				foreach ( $section['items'] as $item ) {
					$name        = sanitize_text_field( $item['name'] ?? '' );
					$price       = sanitize_text_field( $item['price'] ?? '' );
					$description = sanitize_textarea_field( $item['description'] ?? '' );

					if ( '' === $name && '' === $price && '' === $description ) {
						continue;
					}

					$items[] = array(
						'name'        => $name,
						'price'       => $price,
						'description' => $description,
					);
				}
			}

			if ( '' === $title && empty( $items ) ) {
				continue;
			}

			$sections[] = array(
				'title' => $title,
				'items' => $items,
			);
		}

		return $sections;
	}

	public static function enqueue_admin_assets( $hook_suffix ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$is_plugin_page = false !== strpos( $hook_suffix, 'frankies-headless' );
		$is_managed_post = $screen && in_array( $screen->post_type, array_keys( self::managed_post_types() ), true );

		if ( ! $is_plugin_page && ! $is_managed_post ) {
			return;
		}

		wp_enqueue_media();
		wp_enqueue_script( 'jquery-ui-sortable' );
		wp_register_style( 'frankies-headless-admin', false, array(), '0.2.0' );
		wp_enqueue_style( 'frankies-headless-admin' );
		wp_add_inline_style( 'frankies-headless-admin', self::admin_css() );

		wp_register_script( 'frankies-headless-admin', false, array( 'jquery', 'jquery-ui-sortable' ), '0.2.0', true );
		wp_enqueue_script( 'frankies-headless-admin' );
		wp_localize_script(
			'frankies-headless-admin',
			'frankiesAdmin',
			array(
				'ajaxUrl'        => admin_url( 'admin-ajax.php' ),
				'orderNonce'     => wp_create_nonce( 'frankies_save_content_order' ),
				'selectImage'    => __( 'Select image', 'frankies-headless-cms' ),
				'selectImages'   => __( 'Select images', 'frankies-headless-cms' ),
				'useImage'       => __( 'Use this image', 'frankies-headless-cms' ),
				'useImages'      => __( 'Use selected images', 'frankies-headless-cms' ),
				'saving'         => __( 'Saving order...', 'frankies-headless-cms' ),
				'saved'          => __( 'Order saved.', 'frankies-headless-cms' ),
				'orderFailed'    => __( 'Could not save the order.', 'frankies-headless-cms' ),
				'noImage'        => __( 'No image selected', 'frankies-headless-cms' ),
			)
		);
		wp_add_inline_script( 'frankies-headless-admin', self::admin_js() );
	}

	public static function save_content_order() {
		check_ajax_referer( 'frankies_save_content_order', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to reorder content.', 'frankies-headless-cms' ) ), 403 );
		}

		$orders = wp_unslash( $_POST['orders'] ?? array() );

		if ( ! is_array( $orders ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid order payload.', 'frankies-headless-cms' ) ), 400 );
		}

		foreach ( self::managed_post_types() as $post_type => $label ) {
			if ( empty( $orders[ $post_type ] ) || ! is_array( $orders[ $post_type ] ) ) {
				continue;
			}

			foreach ( array_values( $orders[ $post_type ] ) as $menu_order => $post_id ) {
				$post_id = absint( $post_id );
				$post    = get_post( $post_id );

				if ( ! $post || $post_type !== $post->post_type ) {
					continue;
				}

				wp_update_post(
					array(
						'ID'         => $post_id,
						'menu_order' => $menu_order,
					)
				);
			}
		}

		wp_send_json_success();
	}

	public static function register_dashboard_widgets() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		wp_add_dashboard_widget(
			'frankies_headless_dashboard_widget',
			__( 'Frankies Headless CMS', 'frankies-headless-cms' ),
			array( __CLASS__, 'render_dashboard_widget' )
		);
	}

	public static function render_dashboard_widget() {
		$testimonial_count = wp_count_posts( 'fb_testimonial' );
		$location_count    = wp_count_posts( 'fb_location' );
		$press_count       = wp_count_posts( 'fb_press_item' );

		echo '<p>' . esc_html__( 'Manage the full headless site from wp-admin. Open the page editors dashboard to edit each route separately with all available fields.', 'frankies-headless-cms' ) . '</p>';
		echo '<p><a class="button button-primary" href="' . esc_url( admin_url( 'admin.php?page=frankies-headless-page-editors' ) ) . '">' . esc_html__( 'Open Page Editors', 'frankies-headless-cms' ) . '</a></p>';
		echo '<ul class="fb-dashboard-widget-links">';
		echo '<li><a href="' . esc_url( admin_url( 'admin.php?page=frankies-headless-content' ) ) . '">' . esc_html__( 'Content Dashboard', 'frankies-headless-cms' ) . '</a></li>';
		echo '<li><a href="' . esc_url( admin_url( 'admin.php?page=frankies-headless-page-editors' ) ) . '">' . esc_html__( 'Page Editors', 'frankies-headless-cms' ) . '</a></li>';
		echo '<li><a href="' . esc_url( admin_url( 'edit.php?post_type=fb_testimonial' ) ) . '">' . esc_html__( 'Testimonials', 'frankies-headless-cms' ) . ' (' . esc_html( (string) $testimonial_count->publish ) . ')</a></li>';
		echo '<li><a href="' . esc_url( admin_url( 'edit.php?post_type=fb_location' ) ) . '">' . esc_html__( 'Locations', 'frankies-headless-cms' ) . ' (' . esc_html( (string) $location_count->publish ) . ')</a></li>';
		echo '<li><a href="' . esc_url( admin_url( 'edit.php?post_type=fb_press_item' ) ) . '">' . esc_html__( 'Press Items', 'frankies-headless-cms' ) . ' (' . esc_html( (string) $press_count->publish ) . ')</a></li>';
		echo '<li><a href="' . esc_url( admin_url( 'admin.php?page=frankies-headless-order' ) ) . '">' . esc_html__( 'Content Order', 'frankies-headless-cms' ) . '</a></li>';
		echo '</ul>';
	}

	private static function admin_css() {
		return '
.fb-media-field,.fb-gallery-field{max-width:920px}
.fb-media-field{display:flex;gap:16px;align-items:flex-start}
.fb-media-field__preview,.fb-gallery-item__preview{width:140px;height:100px;border:1px solid #dcdcde;border-radius:8px;background:#f6f7f7;overflow:hidden;flex:0 0 auto}
.fb-media-field__preview img,.fb-gallery-item__preview img{display:block;width:100%;height:100%;object-fit:cover}
.fb-media-field__controls{flex:1 1 auto}
.fb-gallery-field__list,.fb-sortable-list{margin:0;padding:0}
.fb-gallery-item,.fb-sortable-item{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #dcdcde;border-radius:8px;background:#fff;margin-bottom:12px}
.fb-gallery-item__meta,.fb-sortable-item__content{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-width:0}
.fb-gallery-item__url,.fb-sortable-item__meta{color:#50575e;font-size:12px;word-break:break-all}
.fb-gallery-item__buttons{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.fb-gallery-item__handle,.fb-sortable-item__handle{font-size:22px;line-height:1;cursor:move;color:#50575e}
.fb-order-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;max-width:1200px;margin:24px 0}
.fb-order-column{background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:16px}
.fb-order-column__header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}
.fb-order-column__header h2{margin:0}
.fb-sortable-item{cursor:move}
.fb-sortable-item--empty{justify-content:center;color:#646970;font-style:italic;cursor:default}
.fb-sortable-placeholder{border:2px dashed #2271b1;border-radius:8px;height:58px;background:#f0f6fc;margin-bottom:12px}
.fb-menu-builder{max-width:1100px}
.fb-menu-builder__sections{display:flex;flex-direction:column;gap:16px}
.fb-menu-section{border:1px solid #dcdcde;border-radius:10px;background:#fff;padding:16px}
.fb-menu-section__header{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.fb-menu-section__title{flex:1 1 auto}
.fb-menu-section__handle,.fb-menu-item__handle{font-size:22px;line-height:1;cursor:move;color:#50575e}
.fb-menu-section__items{display:flex;flex-direction:column;gap:12px}
.fb-menu-item{display:grid;grid-template-columns:24px minmax(180px,1.5fr) minmax(100px,.6fr) minmax(220px,2fr) auto;gap:12px;align-items:start;padding:12px;border:1px solid #dcdcde;border-radius:8px;background:#f6f7f7}
.fb-menu-item__name,.fb-menu-item__price,.fb-menu-item__description{width:100%}
.fb-home-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.85fr);gap:24px;align-items:start}
.fb-home-layout__form{display:flex;flex-direction:column;gap:20px}
.fb-dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;max-width:1100px;margin-top:24px}
.fb-exact-pages-card{margin-top:24px;background:#fff;border:1px solid #dcdcde;border-radius:12px;padding:20px;max-width:1100px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.fb-exact-pages-card__header h2{margin:0 0 8px}
.fb-exact-pages-card__header p{margin:0 0 18px;color:#50575e}
.fb-exact-pages-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.fb-exact-page-tile{border:1px solid #e7e7e9;border-radius:10px;padding:16px;background:#f9f9fa}
.fb-exact-page-tile h3{margin:0 0 8px}
.fb-exact-page-tile p{margin:0 0 12px;color:#50575e}
.fb-editor-card{background:#fff;border:1px solid #dcdcde;border-radius:12px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.fb-editor-card--stacked{display:flex;flex-direction:column;gap:18px}
.fb-editor-card__header h2{margin:0 0 8px}
.fb-editor-card__header p{margin:0 0 16px;color:#50575e}
.fb-editor-field{display:flex;flex-direction:column;gap:8px;padding-top:14px;margin-top:14px;border-top:1px solid #f0f0f1}
.fb-editor-field:first-of-type{padding-top:0;margin-top:0;border-top:0}
.fb-editor-field__label{font-weight:600}
.fb-section-group{padding-top:18px;border-top:1px solid #f0f0f1}
.fb-section-group:first-of-type{padding-top:0;border-top:0}
.fb-section-group__title{margin:0 0 12px;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:#8a6b5b}
.fb-page-editor-tabs{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}
.fb-page-editor-tab{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border:1px solid #dcdcde;border-radius:999px;background:#fff;color:#1d2327;text-decoration:none}
.fb-page-editor-tab:hover{border-color:#8c8f94;color:#1d2327}
.fb-page-editor-tab--active{background:#1d2327;border-color:#1d2327;color:#fff}
.fb-page-editor-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.85fr);gap:24px;align-items:start}
.fb-page-editor-layout__main{display:flex;flex-direction:column;gap:20px}
.fb-page-editor-layout__sidebar{display:flex;flex-direction:column;gap:20px}
.fb-quick-links{display:flex;flex-wrap:wrap;gap:10px}
.fb-exact-editor{padding-top:18px;border-top:1px solid #f0f0f1}
.fb-exact-editor:first-of-type{padding-top:0;border-top:0}
.fb-exact-editor__header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
.fb-exact-editor__header h3{margin:0 0 6px}
.fb-exact-editor__header p{margin:0;color:#50575e}
.fb-dashboard-widget-links{margin:12px 0 0 18px}
.fb-dashboard-widget-links li{margin:0 0 8px}
.fb-home-preview__sticky{position:sticky;top:32px}
.fb-home-preview__frame{background:linear-gradient(180deg,#fff8f1 0%,#fff 100%);border:1px solid #ead9cb;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(47,22,15,.08)}
.fb-home-preview__eyebrow{margin:0 0 8px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a6b5b}
.fb-home-preview__logo-wrap{margin-bottom:12px}
.fb-home-preview__logo{max-width:150px;max-height:72px;display:block;object-fit:contain}
.fb-home-preview__brand{margin:0;font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:#8a6b5b}
.fb-home-preview__title{margin:10px 0 10px;font-size:34px;line-height:1;letter-spacing:.06em;text-transform:uppercase;color:#2f160f}
.fb-home-preview__copy,.fb-home-preview__story p,.fb-home-preview__footer{margin:0;color:#5c4b43;line-height:1.6}
.fb-home-preview__actions{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}
.fb-home-preview__hero-images{display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:10px}
.fb-home-preview__hero-images img,.fb-home-preview__story img,.fb-home-preview__gallery img{width:100%;display:block;object-fit:cover;border-radius:12px;border:1px solid rgba(47,22,15,.08);background:#f6f7f7}
.fb-home-preview__hero-images img{height:150px}
.fb-home-preview__story{display:grid;grid-template-columns:76px 1fr;gap:14px;align-items:start;margin-top:18px}
.fb-home-preview__story img{height:76px}
.fb-home-preview__story h4{margin:0 0 8px;font-size:18px;letter-spacing:.05em;text-transform:uppercase;color:#2f160f}
.fb-home-preview__gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}
.fb-home-preview__gallery img{height:78px}
@media (max-width: 1200px){.fb-home-layout,.fb-page-editor-layout{grid-template-columns:1fr}.fb-home-preview__sticky{position:static}}
[hidden]{display:none !important}
';
	}

	private static function admin_js() {
		return <<<'JS'
jQuery(function ($) {
  function previewValue($root, key) {
    const $field = $root.find(`[data-preview-key="${key}"]`).first();
    if (!$field.length) {
      return "";
    }
    if ($field.is("input, textarea")) {
      return $field.val() || "";
    }
    if ($field.hasClass("fb-media-field")) {
      return $field.find(".fb-media-field__input").val() || "";
    }
    return "";
  }

  function previewGalleryValues($root, key) {
    const $field = $root.find(`[data-preview-key="${key}"]`).first();
    if (!$field.length) {
      return [];
    }
    return $field.find(".fb-gallery-item__input").map(function () {
      return ($(this).val() || "").trim();
    }).get().filter(Boolean);
  }

  function syncHomePreview() {
    const $root = $(".fb-home-editor");
    if (!$root.length) {
      return;
    }

    [
      "brand_name",
      "hero_title",
      "hero_copy",
      "secret_sauce_title",
      "secret_sauce_copy",
      "menu_primary_label",
      "menu_secondary_label",
      "follow_label",
      "footer_note"
    ].forEach(function (key) {
      const value = previewValue($root, key);
      $root.find(`[data-preview-target="${key}"]`).text(value);
    });

    ["logo_image", "hero_left_image", "hero_center_image", "hero_right_image", "skull_image"].forEach(function (key) {
      const value = previewValue($root, key);
      const $image = $root.find(`[data-preview-image="${key}"]`);
      $image.attr("src", value || "");
      if (key === "logo_image") {
        if (value) {
          $image.removeAttr("hidden");
        } else {
          $image.attr("hidden", "hidden");
        }
      }
    });

    const galleryImages = previewGalleryValues($root, "gallery_images");
    const galleryHtml = galleryImages.map(function (url) {
      return `<img src="${$("<div>").text(url).html()}" alt="">`;
    }).join("");
    $root.find("[data-preview-gallery='gallery_images']").html(galleryHtml);
  }

  function sectionTemplate() {
    return $(
      `<div class="fb-menu-section">
        <div class="fb-menu-section__header">
          <span class="fb-menu-section__handle" aria-hidden="true">&#8801;</span>
          <input type="text" class="regular-text fb-menu-section__title" value="" placeholder="Section title" />
          <button type="button" class="button-link-delete fb-menu-section-remove">Remove Section</button>
        </div>
        <div class="fb-menu-section__items"></div>
        <p><button type="button" class="button button-small fb-menu-builder-add-item">Add Item</button></p>
      </div>`
    );
  }

  function itemTemplate() {
    return $(
      `<div class="fb-menu-item">
        <span class="fb-menu-item__handle" aria-hidden="true">&#8801;</span>
        <input type="text" class="fb-menu-item__name" value="" placeholder="Item name" />
        <input type="text" class="fb-menu-item__price" value="" placeholder="Price" />
        <textarea class="fb-menu-item__description" rows="2" placeholder="Description"></textarea>
        <button type="button" class="button-link-delete fb-menu-item-remove">Remove</button>
      </div>`
    );
  }

  function syncMenuBuilder($builder) {
    const sections = $builder.find(".fb-menu-section").map(function () {
      const $section = $(this);
      const section = {
        title: ($section.find(".fb-menu-section__title").val() || "").trim(),
        items: $section.find(".fb-menu-item").map(function () {
          const $item = $(this);
          return {
            name: ($item.find(".fb-menu-item__name").val() || "").trim(),
            price: ($item.find(".fb-menu-item__price").val() || "").trim(),
            description: ($item.find(".fb-menu-item__description").val() || "").trim()
          };
        }).get().filter(function (item) {
          return item.name || item.price || item.description;
        })
      };
      return section;
    }).get().filter(function (section) {
      return section.title || section.items.length;
    });

    $builder.find(".fb-menu-builder__input").val(JSON.stringify(sections));
  }

  function updateMediaField($field, url) {
    const $input = $field.find(".fb-media-field__input");
    const $preview = $field.find(".fb-media-field__preview");
    const $image = $preview.find("img");
    const $remove = $field.find(".fb-media-remove");
    $input.val(url || "");
    if (url) {
      $image.attr("src", url);
      $preview.removeAttr("hidden");
      $remove.removeAttr("hidden");
    } else {
      $image.attr("src", "");
      $preview.attr("hidden", "hidden");
      $remove.attr("hidden", "hidden");
    }
    syncHomePreview();
  }

  function createGalleryItem(url, inputName) {
    const safeUrl = url || "";
    const escapedUrl = $("<div>").text(safeUrl).html();
    const hidden = safeUrl ? "" : " hidden";
    return $(
      `<li class="fb-gallery-item">
        <span class="fb-gallery-item__handle" aria-hidden="true">&#8801;</span>
        <div class="fb-gallery-item__preview"${hidden}><img src="${escapedUrl}" alt=""></div>
        <input type="hidden" class="fb-gallery-item__input" name="${inputName}[]" value="${escapedUrl}">
        <div class="fb-gallery-item__meta">
          <span class="fb-gallery-item__url">${escapedUrl}</span>
          <div class="fb-gallery-item__buttons">
            <button type="button" class="button button-small fb-gallery-replace">Replace</button>
            <button type="button" class="button-link-delete fb-gallery-remove">Remove</button>
          </div>
        </div>
      </li>`
    );
  }

  function syncGalleryItem($item, url) {
    const $preview = $item.find(".fb-gallery-item__preview");
    $item.find(".fb-gallery-item__input").val(url);
    $item.find(".fb-gallery-item__url").text(url || frankiesAdmin.noImage);
    $preview.find("img").attr("src", url || "");
    if (url) {
      $preview.removeAttr("hidden");
    } else {
      $preview.attr("hidden", "hidden");
    }
    syncHomePreview();
  }

  $(".fb-media-upload").on("click", function () {
    const $field = $(this).closest(".fb-media-field");
    const frame = wp.media({
      title: frankiesAdmin.selectImage,
      button: { text: frankiesAdmin.useImage },
      multiple: false,
      library: { type: "image" }
    });

    frame.on("select", function () {
      const attachment = frame.state().get("selection").first().toJSON();
      updateMediaField($field, attachment.url || "");
    });

    frame.open();
  });

  $(".fb-media-remove").on("click", function () {
    updateMediaField($(this).closest(".fb-media-field"), "");
  });

  $(".fb-gallery-field__list").sortable({
    handle: ".fb-gallery-item__handle",
    placeholder: "fb-sortable-placeholder",
    update: function () {
      syncHomePreview();
    }
  });

  $(".fb-gallery-add").on("click", function () {
    const $field = $(this).closest(".fb-gallery-field");
    const $list = $field.find(".fb-gallery-field__list");
    const inputName = ($field.data("input-name") || ($list.find(".fb-gallery-item__input").first().attr("name") || "").replace(/\[\]$/, ""));
    const frame = wp.media({
      title: frankiesAdmin.selectImages,
      button: { text: frankiesAdmin.useImages },
      multiple: true,
      library: { type: "image" }
    });

    frame.on("select", function () {
      frame.state().get("selection").each(function (attachment) {
        const data = attachment.toJSON();
        $list.append(createGalleryItem(data.url || "", inputName));
      });
      syncHomePreview();
    });

    frame.open();
  });

  $(document).on("click", ".fb-gallery-remove", function () {
    $(this).closest(".fb-gallery-item").remove();
    syncHomePreview();
  });

  $(document).on("click", ".fb-gallery-replace", function () {
    const $item = $(this).closest(".fb-gallery-item");
    const frame = wp.media({
      title: frankiesAdmin.selectImage,
      button: { text: frankiesAdmin.useImage },
      multiple: false,
      library: { type: "image" }
    });

    frame.on("select", function () {
      const attachment = frame.state().get("selection").first().toJSON();
      syncGalleryItem($item, attachment.url || "");
    });

    frame.open();
  });

  $(".fb-sortable-list").sortable({
    handle: ".fb-sortable-item__handle",
    items: ".fb-sortable-item:not(.fb-sortable-item--empty)",
    placeholder: "fb-sortable-placeholder"
  });

  $(".fb-menu-builder__sections").sortable({
    handle: ".fb-menu-section__handle",
    items: ".fb-menu-section",
    placeholder: "fb-sortable-placeholder",
    update: function () {
      syncMenuBuilder($(this).closest(".fb-menu-builder"));
    }
  });

  $(".fb-menu-section__items").sortable({
    handle: ".fb-menu-item__handle",
    items: ".fb-menu-item",
    placeholder: "fb-sortable-placeholder",
    update: function () {
      syncMenuBuilder($(this).closest(".fb-menu-builder"));
    }
  });

  $(".fb-menu-builder").each(function () {
    syncMenuBuilder($(this));
  });

  syncHomePreview();

  $(document).on("click", ".fb-menu-builder-add-section", function () {
    const $builder = $(this).closest(".fb-menu-builder");
    const $section = sectionTemplate();
    $builder.find(".fb-menu-builder__sections").append($section);
    $section.find(".fb-menu-section__items").sortable({
      handle: ".fb-menu-item__handle",
      items: ".fb-menu-item",
      placeholder: "fb-sortable-placeholder",
      update: function () {
        syncMenuBuilder($builder);
      }
    });
    syncMenuBuilder($builder);
  });

  $(document).on("click", ".fb-menu-builder-add-item", function () {
    const $section = $(this).closest(".fb-menu-section");
    const $builder = $section.closest(".fb-menu-builder");
    $section.find(".fb-menu-section__items").append(itemTemplate());
    syncMenuBuilder($builder);
  });

  $(document).on("click", ".fb-menu-section-remove", function () {
    const $builder = $(this).closest(".fb-menu-builder");
    $(this).closest(".fb-menu-section").remove();
    syncMenuBuilder($builder);
  });

  $(document).on("click", ".fb-menu-item-remove", function () {
    const $builder = $(this).closest(".fb-menu-builder");
    $(this).closest(".fb-menu-item").remove();
    syncMenuBuilder($builder);
  });

  $(document).on("input change", ".fb-menu-builder input, .fb-menu-builder textarea", function () {
    syncMenuBuilder($(this).closest(".fb-menu-builder"));
  });

  $(document).on("input change", ".fb-home-editor input, .fb-home-editor textarea", function () {
    syncHomePreview();
  });

  $("#fb-save-order").on("click", function () {
    const $button = $(this);
    const $status = $("#fb-save-order-status");
    const orders = {};

    $(".fb-sortable-list").each(function () {
      const postType = $(this).data("post-type");
      orders[postType] = $(this)
        .find(".fb-sortable-item[data-post-id]")
        .map(function () {
          return $(this).data("post-id");
        })
        .get();
    });

    $button.prop("disabled", true);
    $status.text(frankiesAdmin.saving);

    $.post(frankiesAdmin.ajaxUrl, {
      action: "frankies_save_content_order",
      nonce: frankiesAdmin.orderNonce,
      orders: orders
    })
      .done(function (response) {
        if (response && response.success) {
          $status.text(frankiesAdmin.saved);
        } else {
          $status.text(frankiesAdmin.orderFailed);
        }
      })
      .fail(function () {
        $status.text(frankiesAdmin.orderFailed);
      })
      .always(function () {
        $button.prop("disabled", false);
      });
  });
});
JS;
	}

	private static function settings_fields() {
		return array(
			'brand_name'           => array( 'label' => 'Brand name', 'type' => 'text', 'section' => 'frankies_headless_branding', 'placeholder' => 'UPTOWN 66' ),
			'logo_image'           => array( 'label' => 'Logo image', 'type' => 'media', 'section' => 'frankies_headless_branding', 'placeholder' => 'https://...', 'preview' => true ),
			'hero_title'           => array( 'label' => 'Hero title', 'type' => 'text', 'section' => 'frankies_headless_home_hero', 'placeholder' => 'UPTOWN 66' ),
			'hero_copy'            => array( 'label' => 'Hero copy', 'type' => 'textarea', 'rows' => 4, 'section' => 'frankies_headless_home_hero', 'placeholder' => 'Main homepage introduction.' ),
			'secret_sauce_title'   => array( 'label' => 'Secret sauce title', 'type' => 'text', 'section' => 'frankies_headless_home_hero', 'placeholder' => 'THE SECRET SAUCE OF UPTOWN 66' ),
			'secret_sauce_copy'    => array( 'label' => 'Secret sauce copy', 'type' => 'textarea', 'rows' => 5, 'section' => 'frankies_headless_home_hero', 'placeholder' => 'Secondary homepage story copy.' ),
			'order_url'            => array( 'label' => 'Global order URL', 'type' => 'url', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'https://example.com/order' ),
			'menu_primary_label'   => array( 'label' => 'Miami menu button label', 'type' => 'text', 'section' => 'frankies_headless_home_menu', 'placeholder' => 'MENU' ),
			'menu_primary_url'     => array( 'label' => 'Miami menu button link', 'type' => 'url', 'section' => 'frankies_headless_home_menu', 'placeholder' => 'https://www.yoursite.com/miamimenu' ),
			'menu_secondary_label' => array( 'label' => 'Hallandale menu button label', 'type' => 'text', 'section' => 'frankies_headless_home_menu', 'placeholder' => 'MENU' ),
			'menu_secondary_url'   => array( 'label' => 'Hallandale menu button link', 'type' => 'url', 'section' => 'frankies_headless_home_menu', 'placeholder' => 'https://www.yoursite.com/hallandalemenu' ),
			'follow_label'         => array( 'label' => 'Follow label', 'type' => 'text', 'section' => 'frankies_headless_home_menu', 'placeholder' => 'FOLLOW US' ),
			'instagram_url'        => array( 'label' => 'Instagram URL', 'type' => 'url', 'section' => 'frankies_headless_home_menu', 'placeholder' => 'https://www.instagram.com/youraccount/' ),
			'footer_note'          => array( 'label' => 'Footer note', 'type' => 'text', 'section' => 'frankies_headless_home_menu', 'placeholder' => 'Short footer line.' ),
			'hero_left_image'      => array( 'label' => 'Home hero image left', 'type' => 'media', 'section' => 'frankies_headless_home_images', 'placeholder' => 'https://...', 'preview' => true ),
			'hero_center_image'    => array( 'label' => 'Home hero image center', 'type' => 'media', 'section' => 'frankies_headless_home_images', 'placeholder' => 'https://...', 'preview' => true ),
			'hero_right_image'     => array( 'label' => 'Home hero image right', 'type' => 'media', 'section' => 'frankies_headless_home_images', 'placeholder' => 'https://...', 'preview' => true ),
			'skull_image'          => array( 'label' => 'Home skull graphic', 'type' => 'media', 'section' => 'frankies_headless_home_images', 'placeholder' => 'https://...', 'preview' => true ),
			'gallery_images'       => array( 'label' => 'Home gallery images', 'type' => 'gallery', 'rows' => 7, 'help' => 'Upload or select images, then drag them into the order you want.', 'section' => 'frankies_headless_home_images', 'placeholder' => "https://...\nhttps://...\nhttps://..." ),
			'about_title'          => array( 'label' => 'About page title', 'type' => 'text', 'section' => 'frankies_headless_about', 'placeholder' => 'GET TO KNOW US' ),
			'about_copy'           => array( 'label' => 'About page copy', 'type' => 'textarea', 'rows' => 6, 'section' => 'frankies_headless_about', 'placeholder' => 'About page introduction and story.' ),
			'about_banner_image'   => array( 'label' => 'About banner image', 'type' => 'media', 'section' => 'frankies_headless_about', 'placeholder' => 'https://...', 'preview' => true ),
			'about_portrait_image' => array( 'label' => 'About portrait image', 'type' => 'media', 'section' => 'frankies_headless_about', 'placeholder' => 'https://...', 'preview' => true ),
			'about_primary_image'  => array( 'label' => 'About primary image', 'type' => 'media', 'section' => 'frankies_headless_about', 'placeholder' => 'https://...', 'preview' => true ),
			'about_secondary_image'=> array( 'label' => 'About secondary image', 'type' => 'media', 'section' => 'frankies_headless_about', 'placeholder' => 'https://...', 'preview' => true ),
			'press_title'          => array( 'label' => 'Press page title', 'type' => 'text', 'section' => 'frankies_headless_press_page', 'placeholder' => 'PRESS' ),
			'press_copy'           => array( 'label' => 'Press page intro', 'type' => 'textarea', 'rows' => 4, 'section' => 'frankies_headless_press_page', 'placeholder' => 'Short intro above the press items.' ),
			'press_item_1_image'   => array( 'label' => 'Press card 1 image', 'type' => 'media', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://...', 'preview' => true ),
			'press_item_1_outlet'  => array( 'label' => 'Press card 1 outlet', 'type' => 'text', 'section' => 'frankies_headless_press_page', 'placeholder' => 'MIAMI HERALD' ),
			'press_item_1_title'   => array( 'label' => 'Press card 1 title', 'type' => 'textarea', 'rows' => 3, 'section' => 'frankies_headless_press_page', 'placeholder' => 'Press card headline.' ),
			'press_item_1_url'     => array( 'label' => 'Press card 1 link', 'type' => 'url', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://example.com/article' ),
			'press_item_2_image'   => array( 'label' => 'Press card 2 image', 'type' => 'media', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://...', 'preview' => true ),
			'press_item_2_outlet'  => array( 'label' => 'Press card 2 outlet', 'type' => 'text', 'section' => 'frankies_headless_press_page', 'placeholder' => 'MIAMI NEW TIMES' ),
			'press_item_2_title'   => array( 'label' => 'Press card 2 title', 'type' => 'textarea', 'rows' => 3, 'section' => 'frankies_headless_press_page', 'placeholder' => 'Press card headline.' ),
			'press_item_2_url'     => array( 'label' => 'Press card 2 link', 'type' => 'url', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://example.com/article' ),
			'press_item_3_image'   => array( 'label' => 'Press card 3 image', 'type' => 'media', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://...', 'preview' => true ),
			'press_item_3_outlet'  => array( 'label' => 'Press card 3 outlet', 'type' => 'text', 'section' => 'frankies_headless_press_page', 'placeholder' => 'MIAMI NEW TIMES' ),
			'press_item_3_title'   => array( 'label' => 'Press card 3 title', 'type' => 'textarea', 'rows' => 3, 'section' => 'frankies_headless_press_page', 'placeholder' => 'Press card headline.' ),
			'press_item_3_url'     => array( 'label' => 'Press card 3 link', 'type' => 'url', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://example.com/article' ),
			'press_item_4_image'   => array( 'label' => 'Press card 4 image', 'type' => 'media', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://...', 'preview' => true ),
			'press_item_4_outlet'  => array( 'label' => 'Press card 4 outlet', 'type' => 'text', 'section' => 'frankies_headless_press_page', 'placeholder' => 'BROKEN PLATE' ),
			'press_item_4_title'   => array( 'label' => 'Press card 4 title', 'type' => 'textarea', 'rows' => 3, 'section' => 'frankies_headless_press_page', 'placeholder' => 'Press card headline.' ),
			'press_item_4_url'     => array( 'label' => 'Press card 4 link', 'type' => 'url', 'section' => 'frankies_headless_press_page', 'placeholder' => 'https://example.com/article' ),
			'locations_title'      => array( 'label' => 'Locations page title', 'type' => 'text', 'section' => 'frankies_headless_locations_page', 'placeholder' => 'Locations - Miami' ),
			'locations_copy'       => array( 'label' => 'Locations page intro', 'type' => 'textarea', 'rows' => 4, 'section' => 'frankies_headless_locations_page', 'placeholder' => 'Short intro above the locations list.' ),
			'locations_miami_image' => array( 'label' => 'Miami location card image', 'type' => 'media', 'section' => 'frankies_headless_locations_page', 'placeholder' => 'https://...', 'preview' => true ),
			'locations_hallandale_image' => array( 'label' => 'Hallandale location card image', 'type' => 'media', 'section' => 'frankies_headless_locations_page', 'placeholder' => 'https://...', 'preview' => true ),
			'miami_label'          => array( 'label' => 'Miami location label', 'type' => 'text', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'Miami' ),
			'hallandale_label'     => array( 'label' => 'Hallandale location label', 'type' => 'text', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'Hallandale' ),
			'hallandale_subtitle'  => array( 'label' => 'Hallandale location subtitle', 'type' => 'text', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'Atlantic Village' ),
			'hours_heading'        => array( 'label' => 'Hours and location heading', 'type' => 'text', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'HOURS & LOCATION' ),
			'happy_hour_heading'   => array( 'label' => 'Happy hour heading', 'type' => 'text', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'HAPPY HOUR' ),
			'hallandale_happy_hour_copy' => array( 'label' => 'Hallandale happy hour copy', 'type' => 'textarea', 'rows' => 3, 'section' => 'frankies_headless_menu_page_content', 'placeholder' => "Monday-Friday\n4pm-7pm" ),
			'menu_page_title'      => array( 'label' => 'Menu page title', 'type' => 'text', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'MENU' ),
			'menu_page_brand'      => array( 'label' => 'Menu page brand title', 'type' => 'text', 'section' => 'frankies_headless_menu_page_content', 'placeholder' => 'UPTOWN 66' ),
			'miami_menu_sections'  => array( 'label' => 'Miami menu sections', 'type' => 'menu_builder', 'section' => 'frankies_headless_menu_page_content' ),
			'hallandale_menu_sections' => array( 'label' => 'Hallandale menu sections', 'type' => 'menu_builder', 'section' => 'frankies_headless_menu_page_content' ),
			'home_main_markup'     => array( 'label' => 'Home page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the Home page main area.', 'section' => 'frankies_headless_menus' ),
			'about_main_markup'    => array( 'label' => 'About page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the About page main area.', 'section' => 'frankies_headless_menus' ),
			'locations_main_markup' => array( 'label' => 'Locations page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the Locations page main area.', 'section' => 'frankies_headless_menus' ),
			'press_main_markup'    => array( 'label' => 'Press page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the Press page main area.', 'section' => 'frankies_headless_menus' ),
			'mimo_main_markup'     => array( 'label' => 'Miami location page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the Miami location page main area.', 'section' => 'frankies_headless_menus' ),
			'hallandale_main_markup' => array( 'label' => 'Hallandale page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the Hallandale page main area.', 'section' => 'frankies_headless_menus' ),
			'miami_menu_markup'    => array( 'label' => 'Miami menu page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the Miami menu main area.', 'section' => 'frankies_headless_menus' ),
			'hallandale_menu_markup' => array( 'label' => 'Hallandale menu page markup', 'type' => 'textarea', 'rows' => 18, 'raw' => true, 'help' => 'Raw HTML for the Hallandale menu main area.', 'section' => 'frankies_headless_menus' ),
		);
	}

	private static function default_settings() {
		return array(
			'brand_name'           => 'UPTOWN 66',
			'logo_image'           => '',
			'hero_title'           => 'UPTOWN 66',
			'hero_copy'            => 'UPTOWN 66 IS AN EXPLORATION OF AUTHENTIC MEXICAN STREET FOOD THROUGH THE LENS OF CHEF NUNO. SOURCING FRESHEST LOCAL PRODUCE AND HIGHEST QUALITY MEATS AND SEAFOOD.',
			'secret_sauce_title'   => 'THE SECRET SAUCE OF UPTOWN 66',
			'secret_sauce_copy'    => 'WITH THE CELEBRATION OF OUR CULINARY PASSION, UPTOWN 66 FEATURES HAND-PRESSED TORTILLAS MADE FROM HEIRLOOM CORN SOURCED FROM OAXACA AND SIGNATURE BARBACOA CRAFTED FROM SHORT-RIB, OXTAIL, AND BEEF CHEEK, ALL SLOW-BRAISED WITH MEXICAN CHILIS TO DEVELOP RICH, AUTHENTIC FLAVORS.',
			'order_url'            => 'https://frankiesbreakfastburritos.toast.site/',
			'menu_primary_label'   => 'MENU',
			'menu_primary_url'     => 'https://www.uptown66.miami/miamimenu',
			'menu_secondary_label' => 'MENU',
			'menu_secondary_url'   => 'https://www.uptown66.miami/hallandalemenu',
			'follow_label'         => 'FOLLOW US',
			'instagram_url'        => 'https://www.instagram.com/uptown66miami/',
			'footer_note'          => 'Authentic Mexican street food. Headless, editable, and fast.',
			'hero_left_image'      => 'https://static.wixstatic.com/media/da4e2b_e5387738ea224c458aa7335e1e8f48cb~mv2.jpg/v1/fill/w_147,h_221,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMGL0082_JPG.jpg',
			'hero_center_image'    => 'https://static.wixstatic.com/media/da4e2b_71a8a0efdfd7425da73e0202e531a5b3~mv2.jpg/v1/fill/w_2500,h_1666,al_c/da4e2b_71a8a0efdfd7425da73e0202e531a5b3~mv2.jpg',
			'hero_right_image'     => 'https://static.wixstatic.com/media/da4e2b_71a8a0efdfd7425da73e0202e531a5b3~mv2.jpg/v1/fill/w_147,h_98,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/3Q5A0140.jpg',
			'skull_image'          => 'https://static.wixstatic.com/media/da4e2b_88a856d8e39542a1aba400685cd3a2d0~mv2.png/v1/fill/w_55,h_77,al_c,q_85,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/SKULL.png',
			'gallery_images'       => implode(
				"\n",
				array(
					'https://static.wixstatic.com/media/da4e2b_98c8e386a1484ab28115d33ceca90c6b~mv2.jpg/v1/fill/w_147,h_220,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMGL0493_JPG.jpg',
					'https://static.wixstatic.com/media/da4e2b_27d4859a62e64fb08564fef816cd15ef~mv2.jpg/v1/fill/w_147,h_184,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/3Q5A0141.jpg',
					'https://static.wixstatic.com/media/da4e2b_94aeb82a461941a580b71c72d4deface~mv2.jpg/v1/fill/w_147,h_184,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/3Q5A0235.jpg',
					'https://static.wixstatic.com/media/da4e2b_74d8698ded274f3dae5101dd7c0c4de2~mv2.jpg/v1/fill/w_147,h_182,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMG_2672.jpg',
				)
			),
			'about_title'          => 'GET TO KNOW US',
			'about_copy'           => 'Inspired by our creators Nuno Grullon and Akira van Egmond, Upper East Side MiMo District\'s favorite Mexican cantina is an exploration of authentic Mexican street food through the lens of Chef Nuno. Sourcing the freshest local produce and highest quality meats and seafood, Uptown 66 has become a standard for quality and consistency for locals and visitors alike. Our atmosphere evolves throughout the day, from lunch and happy hour to late-night dining, while staying grounded in flavor, craft, and consistency.',
			'about_banner_image'   => 'https://static.wixstatic.com/media/da4e2b_71a8a0efdfd7425da73e0202e531a5b3~mv2.jpg/v1/fill/w_147,h_98,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/3Q5A0140.jpg',
			'about_portrait_image' => 'https://static.wixstatic.com/media/da4e2b_e103d357da0a4916b06677b312345181_mv2.png/v1/crop/x_112,y_0,w_345,h_480/fill/w_86,h_120,al_c,q_85,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMG_2459_heic.png',
			'about_primary_image'  => 'https://static.wixstatic.com/media/da4e2b_f3b6ad77ffc44f4497ea6512d9897c46_mv2.jpg/v1/fill/w_147,h_98,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMGL0409_JPG.jpg',
			'about_secondary_image'=> 'https://static.wixstatic.com/media/da4e2b_0046467888ae4c36bcb37ea88d6821c4~mv2.jpg/v1/fill/w_147,h_221,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMGL0127_JPG.jpg',
			'press_title'          => 'PRESS',
			'press_copy'           => 'Featured coverage for Uptown 66, from Miami food press to national recognition.',
			'press_item_1_image'   => 'https://static.wixstatic.com/media/da4e2b_cc208a132d5d4d97893e956871c56f1f_mv2.jpeg/v1/fill/w_147,h_83,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/MIA_104UPTOWN6600MIAPPP.jpg',
			'press_item_1_outlet'  => 'MIAMI HERALD',
			'press_item_1_title'   => 'This outdoor Mexican restaurant in Miami just won a national TV contest for best taco',
			'press_item_1_url'     => 'https://www.miamiherald.com/miami-com/restaurants/article278985014.html',
			'press_item_2_image'   => 'https://static.wixstatic.com/media/da4e2b_d817c74e1f7e40adbe5f88041ad0b593~mv2.webp/v1/fill/w_147,h_91,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/tacos_courtesy_of_uptown_66.webp',
			'press_item_2_outlet'  => 'MIAMI NEW TIMES',
			'press_item_2_title'   => 'Miami\'s 2022 Best Tacos',
			'press_item_2_url'     => 'https://www.miaminewtimes.com/best-of/2022/eat-and-drink/best-tacos-14713365',
			'press_item_3_image'   => 'https://static.wixstatic.com/media/da4e2b_b834d47785c34708b903223fcb2f17b0_mv2.jpg/v1/fill/w_144,h_118,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/nuno-grullon-gma2.jpg',
			'press_item_3_outlet'  => 'MIAMI NEW TIMES',
			'press_item_3_title'   => 'Good Morning America Proclaims Miami Taqueria Tops in U.S.',
			'press_item_3_url'     => 'https://www.miaminewtimes.com/restaurants/good-morning-america-proclaimed-this-taqueria-tops-in-miami-17734705',
			'press_item_4_image'   => 'https://static.wixstatic.com/media/da4e2b_b99bae0e13e741b1952c05cdba8514bf_mv2.jpeg/v1/fill/w_147,h_97,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/MIA_105UPTOWN6600MIAPPP.jpg',
			'press_item_4_outlet'  => 'BROKEN PLATE',
			'press_item_4_title'   => 'A Miami Taco Place is Crowned Number One',
			'press_item_4_url'     => 'https://www.brokenpalate.com/p/a-miami-taco-place-is-crowned-number',
			'locations_title'      => 'Locations - Miami',
			'locations_copy'       => 'Locations in Miami MiMo and Hallandale Atlantic Village. Update every address, menu link, and ordering link from wp-admin.',
			'locations_miami_image' => '',
			'locations_hallandale_image' => '',
			'miami_label'          => 'Miami',
			'hallandale_label'     => 'Hallandale',
			'hallandale_subtitle'  => 'Atlantic Village',
			'hours_heading'        => 'HOURS & LOCATION',
			'happy_hour_heading'   => 'HAPPY HOUR',
			'hallandale_happy_hour_copy' => "Monday-Friday\n4pm-7pm",
			'menu_page_title'      => 'MENU',
			'menu_page_brand'      => 'UPTOWN 66',
			'miami_menu_sections'  => wp_json_encode(
				array(
					array(
						'title' => 'Tacos',
						'items' => array(
							array(
								'name'        => 'Barbacoa Taco',
								'price'       => '$6',
								'description' => 'Slow-braised beef, salsa, onion, cilantro.',
							),
							array(
								'name'        => 'Mushroom Taco',
								'price'       => '$5',
								'description' => 'Roasted mushrooms, herbs, salsa verde.',
							),
						),
					),
					array(
						'title' => 'Burritos',
						'items' => array(
							array(
								'name'        => 'Steak Burrito',
								'price'       => '$15',
								'description' => 'Rice, beans, salsa, crema, and grilled steak.',
							),
						),
					),
				)
			),
			'hallandale_menu_sections' => wp_json_encode(
				array(
					array(
						'title' => 'Specialties',
						'items' => array(
							array(
								'name'        => 'Birria Quesadilla',
								'price'       => '$16',
								'description' => 'Crispy tortilla, cheese, consommé, and birria.',
							),
						),
					),
					array(
						'title' => 'Drinks',
						'items' => array(
							array(
								'name'        => 'Horchata',
								'price'       => '$5',
								'description' => 'House-made cinnamon rice drink.',
							),
						),
					),
				)
			),
			'home_main_markup'     => '',
			'about_main_markup'    => '',
			'locations_main_markup' => '',
			'press_main_markup'    => '',
			'mimo_main_markup'     => '',
			'hallandale_main_markup' => '',
			'miami_menu_markup'    => '',
			'hallandale_menu_markup' => '',
		);
	}

	private static function seed_defaults() {
		if ( ! get_option( self::OPTION_KEY ) ) {
			update_option( self::OPTION_KEY, self::default_settings() );
		}

		if ( ! get_posts( array( 'post_type' => 'fb_testimonial', 'posts_per_page' => 1 ) ) ) {
			$testimonials = self::default_testimonials();

			foreach ( $testimonials as $testimonial ) {
				$post_id = wp_insert_post(
					array(
						'post_type'    => 'fb_testimonial',
						'post_status'  => 'publish',
						'post_title'   => $testimonial['title'],
						'post_content' => $testimonial['content'],
					)
				);

				if ( $post_id && ! is_wp_error( $post_id ) ) {
					update_post_meta( $post_id, '_fb_author', $testimonial['author'] );
				}
			}
		}

		if ( ! get_posts( array( 'post_type' => 'fb_location', 'posts_per_page' => 1 ) ) ) {
			$locations = array(
				array(
					'title'     => 'MiMo',
					'content'   => 'Original Uptown 66 location serving Mexican street food in Miami.',
					'address'   => '6600 Biscayne Blvd',
					'city'      => 'Miami, FL 33138',
					'menu_url'  => 'https://www.uptown66.miami/miamimenu',
					'order_url' => 'https://www.uptown66.miami/miamimenu',
					'hours'     => 'Update in wp-admin',
					'phone'     => 'Update in wp-admin',
				),
				array(
					'title'     => 'Hallandale',
					'content'   => 'Second Uptown 66 location with editable content from WordPress.',
					'address'   => '801 N Federal Hwy Suite 109-110',
					'city'      => 'Hallandale Beach, FL 33009',
					'menu_url'  => 'https://www.uptown66.miami/hallandalemenu',
					'order_url' => 'https://www.uptown66.miami/hallandalemenu',
					'hours'     => 'Update in wp-admin',
					'phone'     => 'Update in wp-admin',
				),
			);

			foreach ( $locations as $location ) {
				$post_id = wp_insert_post(
					array(
						'post_type'    => 'fb_location',
						'post_status'  => 'publish',
						'post_title'   => $location['title'],
						'post_content' => $location['content'],
					)
				);

				if ( $post_id && ! is_wp_error( $post_id ) ) {
					foreach ( array( 'address', 'city', 'menu_url', 'order_url', 'hours', 'phone' ) as $field ) {
						update_post_meta( $post_id, '_fb_' . $field, $location[ $field ] );
					}
				}
			}
		}

		if ( ! get_posts( array( 'post_type' => 'fb_press_item', 'posts_per_page' => 1 ) ) ) {
			$press_items = array(
				array(
					'title'   => 'This outdoor Mexican restaurant in Miami just won a national TV contest for best taco',
					'content' => 'Miami Herald coverage of Uptown 66 and its national recognition.',
					'outlet'  => 'MIAMI HERALD',
				),
				array(
					'title'   => 'Miami\'s 2022 Best Tacos',
					'content' => 'Miami New Times named Uptown 66 among the city\'s best taco destinations.',
					'outlet'  => 'MIAMI NEW TIMES',
				),
				array(
					'title'   => 'Good Morning America Proclaims Miami Taqueria Tops in U.S.',
					'content' => 'Coverage of Uptown 66 earning national attention for its tacos.',
					'outlet'  => 'MIAMI NEW TIMES',
				),
				array(
					'title'   => 'A Miami Taco Place is Crowned Number One',
					'content' => 'Broken Plate feature on Uptown 66 and its standout menu.',
					'outlet'  => 'BROKEN PLATE',
				),
			);

			foreach ( $press_items as $press_item ) {
				$press_id = wp_insert_post(
					array(
						'post_type'    => 'fb_press_item',
						'post_status'  => 'publish',
						'post_title'   => $press_item['title'],
						'post_content' => $press_item['content'],
					)
				);

				if ( $press_id && ! is_wp_error( $press_id ) ) {
					update_post_meta( $press_id, '_fb_outlet', $press_item['outlet'] );
					update_post_meta( $press_id, '_fb_url', 'https://www.uptown66.miami/press' );
				}
			}
		}
	}
}

Frankies_Headless_CMS::init();
register_activation_hook( __FILE__, array( 'Frankies_Headless_CMS', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Frankies_Headless_CMS', 'deactivate' ) );
