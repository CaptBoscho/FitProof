//
//  MediaPipePose.m
//  FitProof
//
//  Objective-C bridge for MediaPipe pose detection module
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(MediaPipePose, RCTEventEmitter)

// Camera control methods
RCT_EXTERN_METHOD(startCamera:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopCamera:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)

// Model loading
RCT_EXTERN_METHOD(loadModel:(NSString *)modelPath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)

// Exercise mode setting
RCT_EXTERN_METHOD(setExerciseMode:(NSString *)exercise)

// Native camera activity
RCT_EXTERN_METHOD(openNativeCameraActivity:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)

// Specify that this module supports events
+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end