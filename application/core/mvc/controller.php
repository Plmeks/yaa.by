<?php
	class Controller {
		public $view;
		public $model;
		public $viewBag;
		
		function __construct(){
			$this->view = new View();
		}
		
		function index(){
			$this->formView(__FUNCTION__);
		}

        private function getViewBag($content_view){
			$temp = array();

			ob_start();
			include "application/views/" .PROJECT ."/" .$content_view;
			$temp = $viewBag;
			ob_end_clean();

			return $temp;
		}

		private function formView($action_name, $template_view = "layout.php"){
			$controllerName = str_replace("Controller", "", get_class($this));
			$content_view = $controllerName."/".$action_name.".php";

			$config = $this->getViewBag($content_view);

			if(isset($config['elements']) && BUILD == true){
				$this-> compileLess($config);
				$this-> compileScripts($config);
			}

			$this->view->generate($content_view, $template_view, $config);
		}

		private function compileScripts($config){
            $pathBuildScripts = "build/scripts/" .PROJECT;
			$buildScripts = $pathBuildScripts ."/" .$config["view"]. ".js";
			$scriptString;

            if(isset($config["scripts"]))
                foreach($config["scripts"] as $val){
                    $additionalScript = "scripts/frameworks/" .$val;
                    if(file_exists($additionalScript)) {
                        $scriptString .= file_get_contents($additionalScript).PHP_EOL;
                    }
                }

			foreach($config["elements"] as $val){
                if(isset($val["scripts"]) && $val["scripts"] == false)
                    continue;
				$file = "scripts/" .PROJECT ."/" .$val["type"]. "/" .$val["name"]. "/" .$val["name"]. ".js";
				if(file_exists($file)) {
					$scriptString .= file_get_contents($file).PHP_EOL;
				}
			}
            if (!file_exists($pathBuildScripts)) {
                mkdir($pathBuildScripts, 0777, true);
            }
            if(count($scriptString) != 0 )
			    file_put_contents($buildScripts, $scriptString);
		}

        private function compileLess($config){
            $pathBuildCss = "build/css/" .PROJECT;
            $buildCss = $pathBuildCss ."/" .$config["view"]. ".css";

            $less_folder = "content/less/" . PROJECT ."/";
            $projectLess = $less_folder .PROJECT .".less";

			$options = array('compress' => true);
			$parser = new Less_Parser($options);
			
			$parser->parseFile("content/less/global/global-funcs.less");
			$parser->parseFile("content/less/global/global-site.less");

            if(file_exists($projectLess))
                $parser->parseFile($projectLess);

            if(isset($config["css"]))
                foreach($config["css"] as $val) {
                    $additionalCss = "scripts/frameworks/" .$val;
                    if(file_exists($additionalCss)) {
                        $parser->parseFile($additionalCss);
                    }
                }

			foreach($config["elements"] as $val) {
				$path_element = $val["type"]. "/" .$val["name"]. "/" .$val["name"]. ".less";
				if(file_exists($less_folder.$path_element)) {
					$parser->parseFile($less_folder.$path_element);
                }
			}
            if (!file_exists($pathBuildCss)) {
                mkdir($pathBuildCss, 0777, true);
            }
			file_put_contents($buildCss, $parser->getCss());
		}
	}