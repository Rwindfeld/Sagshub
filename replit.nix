{pkgs}: {
  deps = [
    pkgs.imagemagick_light
    pkgs.mailutils
    pkgs.python312Packages.uvicorn
    pkgs.postgresql
  ];
}
