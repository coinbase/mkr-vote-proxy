{ solidityPackage, dappsys }: solidityPackage {
  name = "ds-thing";
  deps = with dappsys; [ds-auth ds-note ds-math ds-test];
  src = ./src;
}
