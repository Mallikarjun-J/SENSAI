import React from "react";

const MainLayout = async ({ children }) => {
  return <div className="container mx-auto mt-24 mb-20 px-4 sm:px-6 lg:px-8">{children}</div>;
};

export default MainLayout;