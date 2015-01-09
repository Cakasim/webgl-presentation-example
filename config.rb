require 'compass/import-once/activate'

css_dir = "htdocs/css"
sass_dir = "scss"

output_style = (environment == :production) ? :compressed : :expanded