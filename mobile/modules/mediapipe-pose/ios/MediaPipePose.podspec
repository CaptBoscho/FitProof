require "json"

package = JSON.parse(File.read(File.join(__dir__, "../package.json")))

Pod::Spec.new do |s|
  s.name         = "MediaPipePose"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/your-repo/fitproof"
  s.license      = "MIT"
  s.authors      = { "FitProof Team" => "hello@fitproof.com" }
  s.platforms    = { :ios => "12.0" }
  s.source       = { :git => "https://github.com/your-repo/fitproof.git", :tag => "#{s.version}" }

  s.source_files = "*.{h,m,swift}"
  s.resources = "assets/**/*"
  s.requires_arc = true
  s.swift_version = '5.0'

  # MediaPipe dependencies
  s.dependency "MediaPipeTasksVision", "~> 0.10.9"

  # React Native dependencies
  s.dependency "React-Core"
  s.dependency "React-RCTBridge"

  # iOS frameworks
  s.framework = "AVFoundation"
  s.framework = "CoreMedia"
  s.framework = "CoreVideo"
  s.framework = "UIKit"
end