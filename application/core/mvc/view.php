<?php
	class View {
		function generate($content_view, $template_view, $config){
			include_once "application/views/" .PROJECT ."/shared/".$template_view;
		}

		function generatePage($config){
			foreach($config['elements'] as $val){
				$file = "application/views/" .PROJECT ."/partial/" .$val["type"]. "/" .$val["name"]. "/" .$val["name"]. ".php";
				if(file_exists($file))
					include $file;
			}
		}
	}