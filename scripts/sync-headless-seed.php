<?php
$settings = get_option( 'frankies_headless_settings', array() );
$settings['about_copy'] = "Inspired by our creators Nuno Grullon and Akira van Egmond, Upper East Side MiMo District's favorite Mexican cantina is an exploration of authentic Mexican street food through the lens of Chef Nuno. Sourcing the freshest local produce and highest quality meats and seafood, Uptown 66 has become a standard for quality and consistency for locals and visitors alike. Our atmosphere evolves throughout the day, from lunch and happy hour to late-night dining, while staying grounded in flavor, craft, and consistency.";
$settings['about_intro_lead'] = 'Inspired by our creators Nuno Grullon and Akira van Egmond, Upper East Side MiMo District&rsquo;s favorite Mexican cantina, is an exploration of authentic Mexican street food through the lens of Chef Nuno. Sourcing the freshest local produce and highest quality meats, and seafood.';
$settings['about_intro_followup'] = 'Neighborhood favorite, nationwide phenomenon. Don&rsquo;t let awards speak for you, try Uptown 66 and let yourself be the judge.';
$settings['about_title'] = 'GET TO KNOW US';
$settings['about_story_copy'] = 'From our hand-pressed tortillas of heirloom corn from Oaxaca, to our award winning Birria made with short-rib, oxtail and beef cheek slow-braised overnight with our selection of Mexican chilis. It only begins there, this diverse menu has many fan favorites all made from scratch. From the notorious steak burrito to our famous loaded nachos layered with house made cheese sauce. Always leave room for dessert, light airy churros dipped in silky chocolate sauce, creamy caramel flan and a tres leches like you&rsquo;ve never had before. Every dish we serve is to showcase our passion for food.';
$settings['about_primary_image'] = 'https://static.wixstatic.com/media/da4e2b_27d4859a62e64fb08564fef816cd15ef~mv2.jpg/v1/fill/w_2500,h_3125,al_c/da4e2b_27d4859a62e64fb08564fef816cd15ef~mv2.jpg';
$settings['about_secondary_image'] = 'https://static.wixstatic.com/media/da4e2b_0046467888ae4c36bcb37ea88d6821c4~mv2.jpg/v1/fill/w_147,h_221,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/IMGL0127_JPG.jpg';
$settings['press_copy'] = 'Featured coverage for Uptown 66, from Miami food press to national recognition.';
$settings['locations_title'] = 'Locations - Agoura Hills';
$settings['locations_copy'] = 'Agoura Hills location details. Update the address, menu link, and ordering link from wp-admin.';
$settings['mimo_intro_copy'] = 'Uptown 66 now calls Agoura Hills home, serving award-winning tacos with the same unmistakable street food soul. Nestled in the city with bold flavors and no shortcuts, it is the heartbeat of the brand. No frills, just fire.';
$settings['mimo_happy_hour_copy'] = "Monday-Friday\n4pm-7pm";
$settings['mimo_hero_image'] = 'https://static.wixstatic.com/media/da4e2b_b41c698c3ac24a2ba3b44d624217c546~mv2.jpg/v1/fill/w_160,h_90,al_c,q_80,usm_0.66_1.00_0.01,blur_3,enc_avif,quality_auto/da4e2b_b41c698c3ac24a2ba3b44d624217c546_mv2.jpg';
update_option( 'frankies_headless_settings', $settings );

$locations = get_posts(
	array(
		'post_type'   => 'fb_location',
		'numberposts' => -1,
	)
);

foreach ( $locations as $location ) {
	if ( 'MiMo' === $location->post_title || 'Agoura Hills' === $location->post_title ) {
		wp_update_post(
			array(
				'ID'         => $location->ID,
				'post_title' => 'Agoura Hills',
			)
		);
		update_post_meta( $location->ID, '_fb_address', '6600 Biscayne Blvd' );
		update_post_meta( $location->ID, '_fb_city', 'Agoura Hills, CA' );
		update_post_meta( $location->ID, '_fb_menu_url', 'https://www.uptown66.miami/agoura-hillsmenu' );
		update_post_meta( $location->ID, '_fb_order_url', 'https://www.uptown66.miami/agoura-hillsmenu' );
	}

}

$press_posts = get_posts(
	array(
		'post_type'   => 'fb_press_item',
		'numberposts' => -1,
	)
);

foreach ( $press_posts as $press_post ) {
	wp_delete_post( $press_post->ID, true );
}

$press_items = array(
	array(
		'outlet'  => 'MIAMI HERALD',
		'title'   => 'This outdoor Mexican restaurant in Miami just won a national TV contest for best taco',
		'content' => 'Miami Herald coverage of Uptown 66 and its national recognition.',
	),
	array(
		'outlet'  => 'MIAMI NEW TIMES',
		'title'   => "Miami's 2022 Best Tacos",
		'content' => "Miami New Times named Uptown 66 among the city's best taco destinations.",
	),
	array(
		'outlet'  => 'MIAMI NEW TIMES',
		'title'   => 'Good Morning America Proclaims Miami Taqueria Tops in U.S.',
		'content' => 'Coverage of Uptown 66 earning national attention for its tacos.',
	),
	array(
		'outlet'  => 'BROKEN PLATE',
		'title'   => 'A Miami Taco Place is Crowned Number One',
		'content' => 'Broken Plate feature on Uptown 66 and its standout menu.',
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

	update_post_meta( $press_id, '_fb_outlet', $press_item['outlet'] );
	update_post_meta( $press_id, '_fb_url', 'https://www.uptown66.miami/press' );
}

echo 'ok';
