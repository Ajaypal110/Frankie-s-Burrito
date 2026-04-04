<?php
$base_dir = ABSPATH . 'headless-frontend/public/';

function frankies_extract_main_markup( $file_path ) {
	if ( ! file_exists( $file_path ) ) {
		return '';
	}

	$html = file_get_contents( $file_path );
	if ( ! $html ) {
		return '';
	}

	if ( preg_match( '/<main[^>]*data-main-content-parent="true"[^>]*>(.*)<\/main>/isU', $html, $matches ) ) {
		return trim( $matches[1] );
	}

	return '';
}

$settings = get_option( 'frankies_headless_settings', array() );
$markup_map = array(
	'home_main_markup'       => 'index.html',
	'about_main_markup'      => 'about.html',
	'locations_main_markup'  => 'locations.html',
	'press_main_markup'      => 'press.html',
	'mimo_main_markup'       => 'mimo.html',
	'miami_menu_markup'      => 'miamimenu.html',
);

foreach ( $markup_map as $setting_key => $file_name ) {
	$settings[ $setting_key ] = frankies_extract_main_markup( $base_dir . $file_name );
}

update_option( 'frankies_headless_settings', $settings );

echo 'ok';
